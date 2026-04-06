"""
Track A: Vector (Semantic) Search.

Performs cosine-similarity search in Python using numpy.
Loads all active product embeddings, computes similarity against the query
vector, and returns the top-K most relevant items.

This approach works without the pgvector extension — all computation
happens in-memory. For a few thousand products this is perfectly fast.
"""

import logging
import numpy as np
from rag.embeddings import generate_query_embedding

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 15


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


def vector_search(query_text: str, top_k: int = DEFAULT_TOP_K) -> list[dict]:
    """
    Embed the user's query, then find the closest product embeddings
    using cosine similarity computed in Python.

    Returns a list of dicts with product info + similarity score.
    Only returns active products.
    """
    from rag.models import ProductEmbedding

    try:
        query_vector = generate_query_embedding(query_text)
    except Exception as e:
        logger.error(f"[RAG/Vector] Failed to embed query: {e}")
        return []

    query_vec = np.array(query_vector, dtype=np.float32)

    # Load all embeddings for active products
    embeddings = ProductEmbedding.objects.filter(
        product__status='active'
    ).select_related('product').all()

    if not embeddings:
        logger.info("[RAG/Vector] No embeddings found in database.")
        return []

    # Compute similarities
    scored = []
    for pe in embeddings:
        try:
            product_vec = np.array(pe.embedding, dtype=np.float32)
            sim = _cosine_similarity(query_vec, product_vec)
            scored.append((sim, pe))
        except Exception:
            continue

    # Sort by similarity descending, take top K
    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_k]

    results = []
    for similarity, pe in top:
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

    logger.info(f"[RAG/Vector] Found {len(results)} results for: {query_text[:50]}")
    return results
