import os
from typing import TypedDict
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END

# Define Schema for LLM output
class EvaluationResult(BaseModel):
    is_match: bool = Field(description="True if the product matches the agent's requirements, False otherwise.")
    confidence: str = Field(description="Confidence level: high, medium, or low")
    reason: str = Field(description="One sentence explaining why it matches or doesn't")

# Define Graph State
class AgentState(TypedDict):
    product_title: str
    product_desc: str
    product_condition: str
    product_price: str
    agent_requirements: str
    is_match: bool
    confidence: str
    reason: str

def evaluate_node(state: AgentState):
    # Groq model initialization (using llama-3.3-70b-versatile - fast and free)
    api_key = os.environ.get("GROQ_AGENT_API_KEY", "").strip('"').strip("'")
    
    llm = ChatGroq(
        api_key=api_key, 
        model="llama-3.3-70b-versatile",
        temperature=0.1
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a strict product-matching AI agent for an Egyptian auction/marketplace app (buy & sell used items).

Your ONLY job is to determine if a listed product specifically matches a user's buying requirements.

STRICT MATCHING RULES:
1. BRAND / NAME / AUTHOR: If the user mentions a specific brand, person, or author, it MUST appear (or be clearly implied) in the product title or description. A generic category is NOT a match.
2. CONDITION: If the user specifies "used" or "new", it must match exactly. Contradiction = no match.
3. PRICE: If the user mentions a max budget, the starting price must be <= that budget. If price is unknown, be skeptical.
4. SPECIFICITY: Match on specific attributes (model, size, color, edition) if mentioned by the user.
5. DOUBT RULE: If information is missing, vague, or contradictory -> return is_match: false.

OUTPUT FORMAT (strict JSON only, no extra text):
{{
  "is_match": true or false,
  "confidence": "high" | "medium" | "low",
  "reason": "one sentence explaining why it matches or doesn't"
}}
"""),
        ("user", """Product Listing:
- Title: {title}
- Description: {desc}
- Condition: {condition}
- Starting Price: {price} EGP

User's Buying Requirements:
{req}

Does this product specifically and strongly match the user's requirements? Reply in JSON only.""")
    ])
    
    # Using LangChain structured output for Groq
    structured_llm = llm.with_structured_output(EvaluationResult)
    chain = prompt | structured_llm
    
    try:
        result = chain.invoke({
            "title": state.get("product_title", ""),
            "desc": state.get("product_desc", ""),
            "condition": state.get("product_condition", ""),
            "price": str(state.get("product_price", "0")),
            "req": state.get("agent_requirements", "")
        })
        return {
            "is_match": result.is_match, 
            "confidence": result.confidence,
            "reason": result.reason
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[AgentGraph] Groq Evaluation Failed: {e}")
        # Default to False for safety
        return {
            "is_match": False, 
            "confidence": "low",
            "reason": f"Fallback due to error: {str(e)}"
        }

# Build LangGraph
graph_builder = StateGraph(AgentState)
graph_builder.add_node("evaluate", evaluate_node)
graph_builder.set_entry_point("evaluate")
graph_builder.add_edge("evaluate", END)

# Compiled Graph instance ready to use
smart_agent_evaluator = graph_builder.compile()
