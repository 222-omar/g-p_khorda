"""
Vector Search — V2 with Lightweight Re-ranking.

1. Cosine similarity search (Gemini embeddings)
2. Heuristic re-ranking: boost scores based on keyword overlap,
   price relevance, and location match
3. Returns top-K results with enriched scores

Performance:
- EmbeddingCache: loads all ProductEmbeddings from DB once → cached in RAM
- QueryEmbeddingCache: caches Gemini API call per query text
- Background warmup: preloads embeddings at server startup
"""

import logging
import time
import threading
import numpy as np
from rag.embeddings import generate_query_embedding
from rag.intent_router import normalize_arabic

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 10   # Fetch more candidates for re-ranking
FINAL_TOP_K = 4      # Return top 4 after re-ranking
MIN_SIMILARITY = 0.15

# ── Cache TTLs ──────────────────────────────────────────────
_EMBEDDING_CACHE_TTL = 300    # 5 min — reload DB embeddings
_QUERY_CACHE_TTL = 600        # 10 min — reuse Gemini query vectors
_QUERY_CACHE_MAX = 200        # max cached query embeddings


# ═══════════════════════════════════════════════════════════
# 1. In-Memory DB Embedding Cache (avoids Neon round-trip)
# ═══════════════════════════════════════════════════════════

class _EmbeddingCache:
    """
    Loads all ProductEmbeddings from DB once and caches them in RAM.
    Auto-refreshes after TTL. Thread-safe.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._data: list[tuple[np.ndarray, object]] = []  # (vec, ProductEmbedding)
        self._loaded_at: float = 0.0

    def get_all(self) -> list[tuple[np.ndarray, object]]:
        now = time.time()
        if now - self._loaded_at < _EMBEDDING_CACHE_TTL and self._data:
            return self._data
        with self._lock:
            # Double-checked locking
            if now - self._loaded_at < _EMBEDDING_CACHE_TTL and self._data:
                return self._data
            self._reload()
        return self._data

    def _reload(self):
        from rag.models import ProductEmbedding
        try:
            t0 = time.time()
            qs = ProductEmbedding.objects.filter(
                product__status='active'
            ).select_related('product').only(
                'embedding', 'product__id', 'product__title',
                'product__description', 'product__price',
                'product__category', 'product__condition',
                'product__location', 'product__is_auction',
                'product__status',
            )
            data = [(np.array(pe.embedding, dtype=np.float32), pe) for pe in qs]
            self._data = data
            self._loaded_at = time.time()
            ms = int((time.time() - t0) * 1000)
            logger.info(f"[EmbeddingCache] Loaded {len(data)} embeddings from DB in {ms}ms")
        except Exception as e:
            logger.error(f"[EmbeddingCache] Reload failed: {e}")

    def invalidate(self):
        """Call this when a product is saved/deleted."""
        with self._lock:
            self._loaded_at = 0.0
        logger.info("[EmbeddingCache] Invalidated — will reload on next request")


_embedding_cache = _EmbeddingCache()


def get_embedding_cache() -> _EmbeddingCache:
    return _embedding_cache


def warmup_embedding_cache():
    """Call at server startup in a background thread."""
    def _do():
        logger.info("[EmbeddingCache] Warming up in background...")
        _embedding_cache.get_all()
    t = threading.Thread(target=_do, daemon=True, name="embedding-warmup")
    t.start()


# ═══════════════════════════════════════════════════════════
# 2. In-Memory Query Embedding Cache (avoids repeat Gemini calls)
# ═══════════════════════════════════════════════════════════

class _QueryEmbeddingCache:
    """LRU-TTL cache for Gemini query embedding vectors."""
    def __init__(self, max_size=_QUERY_CACHE_MAX, ttl=_QUERY_CACHE_TTL):
        from collections import OrderedDict
        self._cache: OrderedDict = OrderedDict()
        self._max = max_size
        self._ttl = ttl
        self._lock = threading.Lock()

    def get(self, text: str) -> np.ndarray | None:
        key = normalize_arabic(text).strip().lower()
        with self._lock:
            entry = self._cache.get(key)
            if entry and time.time() - entry['ts'] < self._ttl:
                self._cache.move_to_end(key)
                return entry['vec']
        return None

    def set(self, text: str, vec: np.ndarray):
        key = normalize_arabic(text).strip().lower()
        with self._lock:
            if len(self._cache) >= self._max:
                self._cache.popitem(last=False)
            self._cache[key] = {'vec': vec, 'ts': time.time()}


_query_emb_cache = _QueryEmbeddingCache()


# ═══════════════════════════════════════════════════════════
# 3. Core Logic
# ═══════════════════════════════════════════════════════════

def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def _rerank(results: list[dict], query: str, entities: dict) -> list[dict]:
    """
    Lightweight heuristic re-ranking. Zero external dependencies.
    
    Boosts:
    - Keyword overlap with query (+0.15 per keyword hit)
    - Price within range (+0.1)
    - Location match (+0.1)
    - Category match (+0.1)
    """
    if not results:
        return results

    query_words = set(normalize_arabic(query).split())
    product_term = normalize_arabic(entities.get("product", query))
    product_words = set(product_term.split())
    price_min = entities.get("price_min")
    price_max = entities.get("price_max")
    location = entities.get("location")
    category = entities.get("category")

    for item in results:
        boost = 0.0
        title_norm = normalize_arabic(item.get('title', ''))

        # Keyword overlap boost
        title_words = set(title_norm.split())
        overlap = product_words & title_words
        boost += len(overlap) * 0.15

        # Exact product term in title
        if product_term in title_norm:
            boost += 0.2

        # Price relevance
        price = item.get('price', 0)
        if price and price_max and price <= price_max:
            boost += 0.1
        if price and price_min and price >= price_min:
            boost += 0.05

        # Location match
        if location and location in (item.get('location', '') or ''):
            boost += 0.1

        # Category match
        if category and item.get('category') == category:
            boost += 0.1

        item['rerank_score'] = item.get('similarity', 0) + boost

    # Sort by re-ranked score
    results.sort(key=lambda x: x.get('rerank_score', 0), reverse=True)
    return results[:FINAL_TOP_K]


def vector_search(query_text: str, entities: dict = None, top_k: int = FINAL_TOP_K) -> list[dict]:
    """
    Embed query → cosine search → heuristic re-rank → top K.
    
    Uses:
    - _query_emb_cache: avoids repeat Gemini API calls
    - _embedding_cache: avoids repeat Neon DB round-trips
    """
    if entities is None:
        entities = {"product": query_text}

    # ── Step 1: Get query embedding (cached) ──
    query_vec = _query_emb_cache.get(query_text)
    if query_vec is None:
        try:
            t0 = time.time()
            raw = generate_query_embedding(query_text)
            query_vec = np.array(raw, dtype=np.float32)
            _query_emb_cache.set(query_text, query_vec)
            ms = int((time.time() - t0) * 1000)
            logger.info(f"[Vector] Gemini embedding took {ms}ms")
        except Exception as e:
            logger.error(f"[Vector] Failed to embed query: {e}")
            return []
    else:
        logger.info("[Vector] Query embedding cache HIT")

    # ── Step 2: Load DB embeddings (cached in RAM) ──
    all_embeddings = _embedding_cache.get_all()
    if not all_embeddings:
        logger.info("[Vector] No embeddings in cache/database.")
        return []

    # ── Step 3: Cosine similarity scoring ──
    scored = []
    for product_vec, pe in all_embeddings:
        try:
            sim = _cosine_similarity(query_vec, product_vec)
            if sim >= MIN_SIMILARITY:
                scored.append((sim, pe))
        except Exception:
            continue

    scored.sort(key=lambda x: x[0], reverse=True)
    candidates = scored[:DEFAULT_TOP_K]  # Over-fetch for re-ranking

    # ── Step 4: Build result dicts ──
    results = []
    for similarity, pe in candidates:
        product = pe.product
        results.append({
            'product_id': product.id,
            'title': product.title,
            'description': product.description[:200] if product.description else '',
            'price': float(product.price),
            'category': product.category,
            'condition': product.condition,
            'location': product.location,
            'status': product.status,
            'is_auction': product.is_auction,
            'similarity': round(similarity, 4),
            'source': 'vector',
        })

    # ── Step 5: Re-rank ──
    results = _rerank(results, query_text, entities)

    logger.info(f"[Vector] {len(results)} results after re-ranking for: '{query_text[:40]}'")
    return results


