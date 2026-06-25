"""LangGraph agent graph: ReAct-style tool-calling loop with reasoning log emission."""

import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from .state import AgentState
from .tools import ALL_TOOLS
from .prompts import SYSTEM_PROMPT
from ..config import settings
from ..logs.logger import reasoning_logger


def _build_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.google_api_key,
        temperature=0.1,
        convert_system_message_to_human=True,
    )


def agent_node(state: AgentState) -> dict:
    """The LLM agent node -- decides what to do or which tool to call."""
    llm = _build_llm().bind_tools(ALL_TOOLS)
    session_id = state.get("session_id", "unknown")

    messages = list(state["messages"])

    has_system = any(isinstance(m, SystemMessage) for m in messages)
    if not has_system:
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages

    from langchain_core.messages import HumanMessage
    has_human = any(isinstance(m, HumanMessage) for m in messages)
    if not has_human:
        messages.append(HumanMessage(content="[Customer has just connected to the chat. Greet them and ask how you can help.]"))

    reasoning_logger.log(
        session_id,
        "llm_call",
        message="Agent is thinking...",
    )

    response = llm.invoke(messages)

    if response.tool_calls:
        for tc in response.tool_calls:
            reasoning_logger.log(
                session_id,
                "tool_call",
                tool_name=tc["name"],
                tool_input=tc["args"],
                reasoning=f"Agent decided to call tool: {tc['name']}",
            )
    else:
        content = response.content if isinstance(response.content, str) else str(response.content)
        reasoning_logger.log(
            session_id,
            "agent_response",
            message=content[:200],
            reasoning="Agent generated final response to customer.",
        )

    return {"messages": [response]}


def tool_result_node(state: AgentState) -> dict:
    """Execute tools and log their results, detecting concrete agent actions."""
    tool_node = ToolNode(ALL_TOOLS)
    result = tool_node.invoke(state)
    session_id = state.get("session_id", "unknown")

    for msg in result.get("messages", []):
        if isinstance(msg, ToolMessage):
            try:
                content = json.loads(msg.content) if isinstance(msg.content, str) else msg.content
            except (json.JSONDecodeError, TypeError):
                content = msg.content

            tool_name = msg.name if hasattr(msg, "name") else "unknown_tool"

            decision = None
            if isinstance(content, dict):
                if content.get("eligible") is True:
                    decision = "ELIGIBLE"
                elif content.get("eligible") is False:
                    decision = "NOT_ELIGIBLE"
                elif content.get("risk_level") == "high":
                    decision = "HIGH_RISK"
                elif content.get("success") is True:
                    decision = content.get("status", "SUCCESS")

            reasoning_logger.log(
                session_id,
                "tool_result",
                tool_name=tool_name,
                tool_output=content,
                decision=decision,
                reasoning=f"Tool '{tool_name}' returned result.",
            )

            _detect_action(session_id, tool_name, content)

    return result


def _detect_action(session_id: str, tool_name: str, content) -> None:
    """Detect concrete actions from tool results and log them."""
    if not isinstance(content, dict) or not content.get("success"):
        return

    if tool_name == "process_refund":
        is_return = content.get("return_required", False)
        reasoning_logger.log_action(
            session_id,
            action_type="return_scheduled" if is_return else "refund_approved",
            refund_number=content.get("refund_number"),
            order_number=content.get("order_number"),
            status=content.get("status"),
            amount=content.get("refund_amount"),
            details={
                "refund_type": content.get("refund_type"),
                "payment_method": content.get("payment_method"),
                "return_shipping_paid_by": content.get("return_shipping_paid_by"),
                "message": content.get("message"),
            },
        )

    elif tool_name == "deny_refund":
        reasoning_logger.log_action(
            session_id,
            action_type="refund_denied",
            refund_number=content.get("refund_number"),
            order_number=content.get("order_number"),
            status="DENIED",
            details={
                "violation_reasons": content.get("violation_reasons"),
                "policy_sections_cited": content.get("policy_sections_cited"),
            },
        )

    elif tool_name == "escalate_to_human":
        reasoning_logger.log_action(
            session_id,
            action_type="escalated_to_human",
            refund_number=content.get("refund_number"),
            order_number=content.get("order_number"),
            status="ESCALATED",
            details={
                "reason": content.get("reason"),
                "message": content.get("message"),
            },
        )

    elif tool_name == "cancel_order":
        reasoning_logger.log_action(
            session_id,
            action_type="order_cancelled",
            order_number=content.get("order_number"),
            status="CANCELLED",
            amount=content.get("refund_amount"),
            details={
                "message": content.get("message"),
            },
        )


def should_continue(state: AgentState) -> str:
    """Route: if the last message has tool calls, go to tools; otherwise end."""
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return END


def build_graph() -> StateGraph:
    """Build and compile the LangGraph agent."""
    graph = StateGraph(AgentState)

    graph.add_node("agent", agent_node)
    graph.add_node("tools", tool_result_node)

    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")

    return graph.compile()


agent_graph = None


def get_agent():
    global agent_graph
    if agent_graph is None:
        agent_graph = build_graph()
    return agent_graph
