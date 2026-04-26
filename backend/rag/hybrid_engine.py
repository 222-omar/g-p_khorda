"""
Hybrid RAG Engine - the heart of the system.

Orchestrates parallel retrieval from both tracks (Vector + SQL),
merges results by product ID, and synthesises a final answer with Gemini.
"""

import os
import time
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from openai import OpenAI

from rag.vector_search import vector_search
from rag.sql_generator import sql_search

logger = logging.getLogger(__name__)

MAX_RESULTS = 15


# ── Parallel Retrieval ─────────────────────────────────────

def retrieve_hybrid(query: str, run_sql: bool = True) -> dict:
    """
    Run vector search and SQL search in parallel using ThreadPoolExecutor.
    Merge results by product_id, capping at MAX_RESULTS.
    SQL matches are prioritised for precision.
    
    If run_sql=False, only vector search is executed (saves ~500 tokens).
    """
    vector_results = []
    sql_results = []
    generated_sql = ""

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(vector_search, query, MAX_RESULTS): 'vector',
        }
        if run_sql:
            futures[executor.submit(sql_search, query)] = 'sql'
        for future in as_completed(futures):
            track = futures[future]
            try:
                result = future.result()
                if track == 'vector':
                    vector_results = result
                elif track == 'sql':
                    sql_results, generated_sql = result
            except Exception as e:
                logger.error(f"[RAG/Hybrid] {track} track failed: {e}")

    # ── Merge by product_id ────────────────────────────────
    seen_ids = set()
    merged = []

    # SQL first (higher precision)
    for item in sql_results:
        pid = item.get('id') or item.get('product_id')
        if pid and pid not in seen_ids:
            seen_ids.add(pid)
            item['_source'] = 'sql'
            merged.append(item)

    # Then vector results (semantic relevance)
    for item in vector_results:
        pid = item.get('product_id') or item.get('id')
        if pid and pid not in seen_ids:
            seen_ids.add(pid)
            item['_source'] = 'vector'
            merged.append(item)

    merged = merged[:MAX_RESULTS]

    # ── Enrich with seller info ────────────────────────────
    merged = _enrich_with_seller_info(merged)

    logger.info(
        f"[RAG/Hybrid] Merged: {len(merged)} items "
        f"(SQL={len(sql_results)}, Vector={len(vector_results)})"
    )

    return {
        "merged_items": merged,
        "vector_count": len(vector_results),
        "sql_count": len(sql_results),
        "generated_sql": generated_sql,
    }


def _enrich_with_seller_info(items: list) -> list:
    """Attach seller name, rating, and trust_score to each merged item."""
    from marketplace.models import Product

    product_ids = []
    for item in items:
        pid = item.get('id') or item.get('product_id')
        if pid:
            product_ids.append(pid)

    if not product_ids:
        return items

    try:
        products = Product.objects.filter(
            id__in=product_ids
        ).select_related('owner__profile').only(
            'id', 'owner__username',
            'owner__profile__seller_rating',
            'owner__profile__trust_score',
            'owner__profile__total_sales',
        )
        product_map = {p.id: p for p in products}
    except Exception as e:
        logger.error(f"[RAG/Hybrid] Seller enrichment failed: {e}")
        return items

    for item in items:
        pid = item.get('id') or item.get('product_id')
        product = product_map.get(pid)
        if product:
            try:
                profile = product.owner.profile
                item['seller_name'] = product.owner.username
                item['seller_rating'] = float(profile.seller_rating)
                item['trust_score'] = profile.trust_score
                item['total_sales'] = profile.total_sales
            except Exception:
                item['seller_name'] = product.owner.username
                item['seller_rating'] = 0
                item['trust_score'] = 50
                item['total_sales'] = 0

    return items


# ── Final Answer Synthesis ─────────────────────────────────

SYNTHESIS_PROMPT = """أنت مساعد ذكي لمنصة "4Sale" - سوق مصري لبيع وشراء المستعمل والخردة.

شغلتك: تاخد نتايج البحث وتلخصها للمستخدم بالعامية المصرية بطريقة ودودة ومفيدة.

القواعد:
1. اتكلم عامية مصرية طبيعية (مش فصحى). مثال: "لقيتلك" مش "وجدت لك".
2. متألفش معلومات أبداً - استخدم بس اللي في النتايج.
3. لو مفيش نتايج: "مش لاقي حاجة تطابق اللي بتدور عليه دلوقتي. جرب بكلمات تانية 🔍"
4. اذكر السعر والحالة والمكان لكل منتج بشكل طبيعي.
5. لو البائع تقييمه عالي (rating >= 4): اذكر "بائع موثوق ⭐"
6. لو البائع تقييمه أقل من 3: متذكرش التقييم.
7. لو فيه مزاد: قول "عليه مزاد!" أو "مزاد نشط 🔥"
8. رتب المنتجات من الأنسب للأقل.
9. خلي الملخص مختصر ومفيد (3-5 جمل).
10. اقترح action مناسب بناءً على السياق:
    - منتج واحد بس → "view_listing"
    - مزاد → "place_bid"
    - أكتر من 3 منتجات بأسعار مختلفة → "compare_prices"
    - مفيش نتايج كويسة → "set_agent"

الرد يكون JSON فقط:
{
  "summary": "ملخص بالعامية المصرية",
  "items": [قائمة IDs المنتجات],
  "suggested_action": "view_listing | place_bid | compare_prices | set_agent"
}"""


def synthesise_answer(query: str, merged_items: list, history: list = None) -> dict:
    """Use Gemini to generate a final Egyptian-Arabic answer from merged results."""
    if not merged_items:
        return {
            "summary": "مش لاقي حاجة تطابق اللي بتدور عليه دلوقتي. جرب بكلمات تانية 🔍",
            "items": [],
            "suggested_action": "set_agent",
        }

    # Build concise context for the LLM
    context_lines = []
    for item in merged_items:
        pid = item.get('id') or item.get('product_id')
        title = item.get('title', '')
        price = item.get('price', '?')
        condition = item.get('condition', '')
        location = item.get('location', '')
        is_auction = item.get('is_auction', False)
        seller_name = item.get('seller_name', '')
        seller_rating = item.get('seller_rating', 0)
        trust_score = item.get('trust_score', 0)

        line = f"- #{pid}: {title} | {price} EGP | {condition} | {location}"
        if seller_name:
            line += f" | Seller: {seller_name} (Rating: {seller_rating}/5, Trust: {trust_score}%)"
        if is_auction:
            line += " | AUCTION"
        context_lines.append(line)

    context = "\n".join(context_lines)

    try:
        api_key = os.environ.get("GROQ_API_KEY", "").strip('"').strip("'")
        _client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )
        # Build messages with optional conversation history
        messages = [
            {"role": "system", "content": SYNTHESIS_PROMPT},
        ]
        
        # Add last 3 conversation messages for context
        if history:
            for msg in history[-3:]:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                if role in ('user', 'assistant') and content:
                    messages.append({"role": role, "content": content})
        
        messages.append({"role": "user", "content": f"سؤال المستخدم: {query}\n\nالنتايج:\n{context}"})
        
        response = _client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.3,
            max_tokens=600,
        )
        raw = response.choices[0].message.content.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        answer = json.loads(raw)
        return answer

    except Exception as e:
        logger.error(f"[RAG/Synthesis] Failed: {e}")
        item_ids = [
            item.get('id') or item.get('product_id')
            for item in merged_items
        ]
        valid_ids = [i for i in item_ids if i]
        if valid_ids:
            return {
                "summary": f"لقيتلك {len(valid_ids)} نتيجة ممكن تناسبك. اتفضل بص عليهم.",
                "items": valid_ids,
                "suggested_action": "view_listing",
            }
        return {
            "summary": "مش لاقي حاجة تطابق اللي بتدور عليه دلوقتي. جرب بكلمات تانية 🔍",
            "items": [],
            "suggested_action": "set_agent",
        }


# ── Main Entry Point ───────────────────────────────────────

def rag_query(query: str, user=None, history: list = None) -> dict:
    """
    Full RAG pipeline with smart token optimization:
    
    1. Intent Router → instant response for greetings/FAQ/chitchat (0 tokens)
    2. Response Cache → cached response for repeated queries (0 tokens)
    3. Smart Retrieval → skip SQL when not needed (save ~500 tokens)
    4. Synthesis → LLM summary only when search results exist
    5. Cache the response for future queries
    6. Log the query
    """
    from rag.models import RAGQueryLog
    from rag.intent_router import classify_intent
    from rag.response_cache import get_cache

    start = time.time()
    error_msg = ""
    cache = get_cache()

    # ── Step 1: Intent Classification (0 tokens) ──────────
    intent = classify_intent(query)
    
    # Fast-path: instant response (greeting, FAQ, chitchat)
    if intent["response"]:
        latency_ms = int((time.time() - start) * 1000)
        
        # Log the query even for instant responses
        try:
            RAGQueryLog.objects.create(
                user=user if user and user.is_authenticated else None,
                query_text=query,
                generated_sql="",
                sql_results_count=0,
                vector_results_count=0,
                merged_results_count=0,
                final_answer=intent["response"],
                latency_ms=latency_ms,
                error="",
            )
        except Exception as e:
            logger.error(f"[RAG] Logging failed: {e}")
        
        return {
            "answer": {
                "summary": intent["response"],
                "items": [],
                "suggested_action": "view_listing",
            },
            "meta": {
                "latency_ms": latency_ms,
                "sql_results": 0,
                "vector_results": 0,
                "merged_results": 0,
                "intent": intent["intent"],
                "tokens_saved": intent["tokens_saved"],
                "cache_hit": False,
            }
        }

    # ── Step 2: Cache Check (0 tokens) ────────────────────
    cached = cache.get(query)
    if cached:
        latency_ms = int((time.time() - start) * 1000)
        
        # Update latency in cached response
        result = cached.copy()
        result["meta"] = {**result.get("meta", {}), "latency_ms": latency_ms, "cache_hit": True}
        
        try:
            RAGQueryLog.objects.create(
                user=user if user and user.is_authenticated else None,
                query_text=query,
                generated_sql="[CACHED]",
                sql_results_count=result["meta"].get("sql_results", 0),
                vector_results_count=result["meta"].get("vector_results", 0),
                merged_results_count=result["meta"].get("merged_results", 0),
                final_answer=result.get("answer", {}).get("summary", ""),
                latency_ms=latency_ms,
                error="",
            )
        except Exception as e:
            logger.error(f"[RAG] Logging failed: {e}")
        
        return result

    # ── Step 3: Smart Retrieval (skip SQL if not needed) ──
    try:
        # Follow-up questions: skip search, use history only with synthesis
        if intent["intent"] == "follow_up" and history:
            merged = []
            generated_sql = ""
            vector_count = 0
            sql_count = 0
            answer = synthesise_answer(query, merged, history=history)
        else:
            retrieval = retrieve_hybrid(query, run_sql=intent["run_sql"])
            merged = retrieval["merged_items"]
            generated_sql = retrieval["generated_sql"]
            vector_count = retrieval["vector_count"]
            sql_count = retrieval["sql_count"]

            answer = synthesise_answer(query, merged, history=history)

    except Exception as e:
        logger.error(f"[RAG] Pipeline error: {e}")
        error_msg = str(e)
        answer = {
            "summary": "حصلت مشكلة تقنية. جرب تاني بعد شوية.",
            "items": [],
            "suggested_action": "view_listing",
        }
        generated_sql = ""
        vector_count = 0
        sql_count = 0
        merged = []

    latency_ms = int((time.time() - start) * 1000)

    result = {
        "answer": answer,
        "meta": {
            "latency_ms": latency_ms,
            "sql_results": sql_count,
            "vector_results": vector_count,
            "merged_results": len(merged),
            "intent": intent["intent"],
            "tokens_saved": intent["tokens_saved"],
            "cache_hit": False,
        }
    }

    # ── Step 4: Cache the result ───────────────────────────
    if not error_msg:
        cache.set(query, result)

    # ── Step 5: Log ───────────────────────────────────────
    try:
        RAGQueryLog.objects.create(
            user=user if user and user.is_authenticated else None,
            query_text=query,
            generated_sql=generated_sql,
            sql_results_count=sql_count,
            vector_results_count=vector_count,
            merged_results_count=len(merged),
            final_answer=answer.get("summary", ""),
            latency_ms=latency_ms,
            error=error_msg,
        )
    except Exception as e:
        logger.error(f"[RAG] Logging failed: {e}")

    return result
