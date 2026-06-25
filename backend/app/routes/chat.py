"""SSE-based chat endpoints for customer conversations."""

import uuid
import json
import traceback
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from ..agent.graph import get_agent
from ..agent.prompts import SYSTEM_PROMPT
from ..logs.logger import reasoning_logger

router = APIRouter(prefix="/api/chat")

# In-memory session store: session_id -> list of LangChain messages
_sessions: dict[str, list] = {}


class ChatRequest(BaseModel):
    session_id: str
    message: str


@router.post("/start")
async def start_chat():
    """Create a new chat session and return the agent's greeting."""
    session_id = str(uuid.uuid4())[:8]
    reasoning_logger.create_session(session_id)

    agent = get_agent()

    try:
        result = agent.invoke({"messages": [], "session_id": session_id})
        messages = result["messages"]
        _sessions[session_id] = messages

        last_msg = messages[-1]
        greeting = _extract_text(last_msg.content) if hasattr(last_msg, "content") else str(last_msg)

        return {
            "session_id": session_id,
            "message": greeting,
        }
    except Exception as e:
        reasoning_logger.log(session_id, "error", message=str(e), reasoning=traceback.format_exc())
        return {
            "session_id": session_id,
            "message": "Hello! Welcome to ShopEase support. How can I help you today?",
            "error": str(e),
        }


@router.post("/message")
async def send_message(req: ChatRequest):
    """Send a message and get the agent's response streamed via SSE."""
    session_id = req.session_id
    user_message = req.message.strip()

    if not user_message:
        return {"error": "Empty message"}

    if session_id not in _sessions:
        return {"error": "Session not found. Please start a new chat."}

    reasoning_logger.log(session_id, "user_message", message=user_message)

    async def event_stream():
        yield _sse_event("typing", {"status": "thinking"})

        messages = _sessions[session_id]
        messages.append(HumanMessage(content=user_message))

        try:
            agent = get_agent()
            result = agent.invoke({"messages": messages, "session_id": session_id})

            _sessions[session_id] = result["messages"]
            last_msg = result["messages"][-1]
            response_content = _extract_text(last_msg.content) if hasattr(last_msg, "content") else str(last_msg)

            customer_info = _extract_customer_info(result["messages"])
            if customer_info:
                reasoning_logger.update_session(session_id, **customer_info)

            yield _sse_event("message", {"content": response_content})

        except Exception as e:
            reasoning_logger.log(session_id, "error", message=str(e), reasoning=traceback.format_exc())
            yield _sse_event("message", {
                "content": "I apologize, but I encountered an error processing your request. Please try again.",
            })

        yield _sse_event("done", {})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _extract_text(content) -> str:
    """Safely extract plain text from LangChain message content.
    
    Gemini can return content as a string, a list of dicts with 'text' keys,
    or other structured formats. This normalises everything to a string.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and "text" in part:
                parts.append(part["text"])
        return "".join(parts)
    return str(content)


def _sse_event(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


def _extract_customer_info(messages) -> dict | None:
    info = {}
    for msg in messages:
        if hasattr(msg, "content") and isinstance(msg.content, str):
            try:
                data = json.loads(msg.content)
                if isinstance(data, dict):
                    if data.get("name"):
                        info["customer_name"] = data["name"]
                    if data.get("customer_name"):
                        info["customer_name"] = data["customer_name"]
                    if data.get("order_number"):
                        info["order_number"] = data["order_number"]
            except (json.JSONDecodeError, TypeError):
                pass
    return info if info else None
