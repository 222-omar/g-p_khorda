"""
InstantResponseNode — handles greeting / faq / chitchat.

Zero LLM tokens. Packages the pre-built response into final_response.
"""

from rag.graph.state import AgentState


def instant_response_node(state: AgentState) -> dict:
    """Package the pre-built intent response as the final answer."""
    return {
        "final_response": {
            "summary": state["intent_response"],
            "items": [],
            "suggested_action": "view_listing",
        },
        "products_data": [],
    }
