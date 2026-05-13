"""
Synthesis Node — V2 with Inline Guardrails.

Combines:
1. LLM synthesis (Egyptian Arabic, structured output)
2. Guardrail checks (no separate LLM call)
3. Self-correction loop (max 1 retry)
4. Product card builder for frontend

This replaces 3 old nodes: synthesis + quality_guard + data_enrichment.
"""

import logging
from langchain_core.prompts import ChatPromptTemplate
from rag.graph.state import AgentState, SynthesisOutput
from rag.graph.config import get_llm

logger = logging.getLogger(__name__)


SYNTHESIS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """أنت مساعد ذكي لمنصة "4Sale" - سوق مصري لبيع وشراء المستعمل والخردة.

شغلتك: تاخد نتايج البحث وتلخصها للمستخدم بالعامية المصرية بطريقة ودودة ومفيدة.

القواعد:
1. اتكلم عامية مصرية طبيعية (مش فصحى). مثال: "لقيتلك" مش "وجدت لك".
2. متألفش معلومات أبداً — استخدم بس اللي في النتايج.
3. قاعدة ذكية للمطابقة:
   - "دراعات بلاستيشن" = "جاك بلاستيشن" = "controller" (نفس المنتج!)
   - لو المنتج بديل أو من نفس الفصيلة → متطابق
   - بس لو الكاتيجوري مختلفة خالص (تلاجة vs غسالة) → استبعده
4. لو مفيش نتائج مطابقة، أو لو المستخدم بيسأل سؤال عام ملوش علاقة بالمنتجات: جاوب عليه بشكل طبيعي وودي كبوت ذكي، بس فكره بذوق إن تخصصك الأساسي هو البيع والشراء في 4Sale، وفي الحالتين رجع items فارغة [].
5. اذكر السعر والحالة والمكان.
6. لو البائع تقييمه >= 4: اذكر "بائع موثوق ⭐"
7. لو فيه مزاد: قول "عليه مزاد! 🔥"
8. خلي الملخص مختصر (3-5 جمل).
9. ⚠️ في items، حط بس IDs المنتجات اللي فعلاً مطابقة — لو مفيش مطابق خلي القايمة فاضية []."""),
    ("user", "طلب المستخدم: {query}\n\nالنتائج المتاحة:\n{context}")
])


def synthesis_node(state: AgentState) -> dict:
    """Synthesize answer + inline guardrails + build product cards."""
    retry = state.get("retry_count", 0)
    fused = state.get("fused_results", [])
    query = state["query"]

    logger.info(f"[Node/Synthesis] {len(fused)} fused results, retry={retry}")

    # ── Build context from fused results ──
    context_lines = []
    valid_ids = set()
    for item in fused:
        pid = item.get('id') or item.get('product_id')
        if pid is None:
            continue
        pid = int(pid)
        valid_ids.add(pid)

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

    context = "\n".join(context_lines) if context_lines else "(لا توجد نتائج)"

    # ── LLM Synthesis (with key rotation on 429) ──
    from rag.graph.config import mark_key_exhausted

    synthesis = None
    last_error = None
    for attempt in range(3):
        try:
            llm, current_key = get_llm(temperature=0.3)
            structured_llm = llm.with_structured_output(SynthesisOutput)
            chain = SYNTHESIS_PROMPT | structured_llm

            result = chain.invoke({"query": query, "context": context})
            synthesis = result.model_dump()
            break  # Success
        except Exception as e:
            last_error = e
            error_str = str(e)
            if "429" in error_str or "rate_limit" in error_str:
                mark_key_exhausted(current_key)
                logger.warning(f"[Node/Synthesis] 429 on attempt {attempt+1}/3, rotating key...")
                continue
            break

    if synthesis is None:
        logger.error(f"[Node/Synthesis] LLM failed after loop. Last error: {last_error}")
        synthesis = {
            "summary": "حصلت مشكلة تقنية. جرب تاني بعد شوية 🔧",
            "items": [],
            "suggested_action": "set_agent",
        }

    # ── Apply Guardrails ──
    retry_update = _apply_guardrails(synthesis, valid_ids, retry)
    if retry_update:
        return retry_update

    # ── Set suggested action ──
    items = synthesis["items"]
    if not items:
        synthesis["suggested_action"] = "set_agent"
    elif len(items) == 1:
        synthesis["suggested_action"] = "view_listing"
    elif any(
        item.get("is_auction") for item in fused
        if int(item.get("id") or item.get("product_id") or 0) in items
    ):
        synthesis["suggested_action"] = "place_bid"
    elif len(items) >= 3:
        synthesis["suggested_action"] = "compare_prices"
    else:
        synthesis["suggested_action"] = "view_listing"

    # ── Build products_data for frontend (From Fused Results, No DB Query) ──
    products_data = _build_products_data(items, fused)

    logger.info(f"[Node/Synthesis] Done: {len(items)} items, action={synthesis['suggested_action']}")

    return {
        "final_response": synthesis,
        "products_data": products_data,
        "next_step": "end",
    }


def _apply_guardrails(synthesis: dict, valid_ids: set, retry: int) -> dict:
    """Apply guardrails to synthesis output and return retry update if needed."""
    returned_ids = synthesis.get("items", [])
    
    # Type mismatch normalize
    valid_ids_normalized = {int(vid) for vid in valid_ids}
    returned_ids_normalized = []
    for pid in returned_ids:
        try:
            returned_ids_normalized.append(int(pid))
        except (ValueError, TypeError):
            continue

    # Guardrail 1: Remove hallucinated IDs
    filtered_ids = [pid for pid in returned_ids_normalized if pid in valid_ids_normalized]
    
    if len(filtered_ids) < len(returned_ids):
        hallucinated = set(returned_ids_normalized) - set(filtered_ids)
        logger.warning(f"[Guardrail] Removed hallucinated IDs: {hallucinated}")
        synthesis["items"] = filtered_ids

    # Guardrail 2: If retry needed and we haven't retried yet
    if not filtered_ids and valid_ids and retry < 1:
        logger.info("[Guardrail] No items matched but results exist → retry")
        return {
            "retry_count": retry + 1,
            "next_step": "retry",
            "final_response": None,  # Explicitly clear old response
        }
        
    return None


def _build_products_data(item_ids: list, fused: list) -> list:
    """Build frontend-ready product cards from fused results instead of DB."""
    ids = {int(pid) for pid in item_ids[:4] if pid}
    if not ids:
        return []

    products_data = []
    for item in fused:
        pid = item.get('id') or item.get('product_id')
        if pid is None:
            continue
        pid = int(pid)
        if pid in ids:
            products_data.append({
                'id': pid,
                'title': item.get('title', ''),
                'price': str(item.get('price', '?')),
                'condition': item.get('condition', ''),
                'location': item.get('location', ''),
                'is_auction': item.get('is_auction', False),
                'primary_image': item.get('image_url') or item.get('primary_image'),
                'owner_name': item.get('seller_name', 'بائع'),
            })
            ids.remove(pid)  # Avoid duplicates
            
    return products_data
