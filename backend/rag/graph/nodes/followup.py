"""
FollowUpNode — handles follow-up questions using conversation history.

Uses the FOLLOWUP_PROMPT with structured output.
"""

import logging
from langchain_core.prompts import ChatPromptTemplate
from rag.graph.state import AgentState, SynthesisOutput
from rag.graph.config import get_llm

logger = logging.getLogger(__name__)


def followup_node(state: AgentState) -> dict:
    """Answer follow-up questions using chat history context. Retries on 429."""
    from rag.graph.config import mark_key_exhausted

    # Format history for the prompt
    history_text = ""
    messages = state.get("messages", [])
    if messages:
        for msg in messages[-3:]:
            role = msg.get('role', 'user') if isinstance(msg, dict) else 'user'
            content = msg.get('content', str(msg)) if isinstance(msg, dict) else str(msg)
            if content:
                history_text += f"{role}: {content}\n"

    prompt = ChatPromptTemplate.from_messages([
        ("system", """أنت مساعد ذكي لمنصة "4Sale" - سوق مصري لبيع وشراء المستعمل والخردة.

شغلتك: الإجابة على سؤال المستخدم بناءً على سياق المحادثة السابقة.

القواعد:
1. اتكلم عامية مصرية طبيعية ودودة.
2. استخرج الإجابة فقط من الرسايل السابقة، متألفش أي معلومات.
3. جاوب مباشرة على السؤال.
4. خلي الـ items فارغة دايماً لأنك بتجاوب على سؤال ومش بتعرض منتجات جديدة."""),
        ("user", "المحادثة السابقة:\n{history}\n\nسؤال المستخدم: {query}")
    ])

    res_dict = None
    for attempt in range(3):
        try:
            llm, current_key = get_llm(temperature=0.3)
            structured_llm = llm.with_structured_output(SynthesisOutput)
            chain = prompt | structured_llm

            result = chain.invoke({"history": history_text, "query": state["query"]})
            res_dict = result.model_dump()
            break
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "rate_limit" in error_str:
                mark_key_exhausted(current_key)
                logger.warning(f"[Node/FollowUp] 429 on attempt {attempt+1}/3, rotating key...")
                continue
            logger.error(f"[Node/FollowUp] Failed: {e}")
            break

    if res_dict is None:
        res_dict = {
            "summary": "عذراً، مش قادر أجاوبك دلوقتي. ممكن توضح أكتر؟",
            "items": [],
            "suggested_action": "view_listing",
        }

    return {
        "final_response": res_dict,
        "products_data": [],
    }
