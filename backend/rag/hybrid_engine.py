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

def retrieve_hybrid(query: str) -> dict:
    """
    Run vector search and SQL search in parallel using ThreadPoolExecutor.
    Merge results by product_id, capping at MAX_RESULTS.
    SQL matches are prioritised for precision.
    """
    vector_results = []
    sql_results = []
    generated_sql = ""

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = {
            executor.submit(vector_search, query, MAX_RESULTS): 'vector',
            executor.submit(sql_search, query): 'sql',
        }
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

SYNTHESIS_PROMPT = """You are a smart assistant for "4sale" - an Egyptian marketplace for scrap and used items.

Your job: take search results and summarize them for the user in Egyptian Arabic (3ammeya).

RULES:
1. Reply in Egyptian Arabic colloquial (not formal Arabic).
2. Never make up information - only use what's in the results.
3. If results are empty, say "مفيش نتايج دلوقتي تطابق اللي بتدور عليه. جرب تدور بكلمات تانية."
4. Suggest an appropriate action (view_listing, place_bid, compare_prices, set_agent).
5. When seller info is available (rating, trust_score), mention it naturally.
   For example: "البائع تقييمه 4.5 نجمة وموثوق بنسبة 90%" or "بائع جديد"
6. Highlight products from highly-rated sellers (rating >= 4) as "recommended".

Reply in JSON ONLY (no extra text):
{
  "summary": "Egyptian Arabic summary of results with seller trust info",
  "items": [list of product IDs],
  "suggested_action": "view_listing | place_bid | compare_prices | set_agent"
}"""


def synthesise_answer(query: str, merged_items: list) -> dict:
    """Use Gemini to generate a final Egyptian-Arabic answer from merged results."""
    if not merged_items:
        return {
            "summary": "mafesh nata2eg delwa2ty tTabe2 elly btdawwar 3aleeh. garrab tdawwar bkelmat tanya.",
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
        response = _client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYNTHESIS_PROMPT},
                {"role": "user", "content": f"User question: {query}\n\nResults:\n{context}"},
            ],
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
        return {
            "summary": f"la2etlak {len(merged_items)} nateega. etfaddal boss 3alehom.",
            "items": [i for i in item_ids if i],
            "suggested_action": "view_listing",
        }


# ── Main Entry Point ───────────────────────────────────────

def rag_query(query: str, user=None) -> dict:
    """
    Full RAG pipeline:
    1. Parallel retrieval (vector + SQL)
    2. Merge results
    3. LLM synthesis
    4. Log the query
    """
    from rag.models import RAGQueryLog

    start = time.time()
    error_msg = ""

    try:
        retrieval = retrieve_hybrid(query)
        merged = retrieval["merged_items"]
        generated_sql = retrieval["generated_sql"]
        vector_count = retrieval["vector_count"]
        sql_count = retrieval["sql_count"]

        answer = synthesise_answer(query, merged)

    except Exception as e:
        logger.error(f"[RAG] Pipeline error: {e}")
        error_msg = str(e)
        answer = {
            "summary": "Hasal moshkela te2neya. Garrab tany ba3d shwaya.",
            "items": [],
            "suggested_action": "view_listing",
        }
        generated_sql = ""
        vector_count = 0
        sql_count = 0
        merged = []

    latency_ms = int((time.time() - start) * 1000)

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

    return {
        "answer": answer,
        "meta": {
            "latency_ms": latency_ms,
            "sql_results": sql_count,
            "vector_results": vector_count,
            "merged_results": len(merged),
        }
    }
