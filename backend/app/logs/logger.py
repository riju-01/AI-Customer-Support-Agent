"""Reasoning log capture and broadcast for the admin dashboard."""

from datetime import datetime, timezone
from typing import Any
import asyncio
import json


class ReasoningLogger:
    """Stores reasoning logs in-memory and broadcasts to connected admin WebSocket clients."""

    def __init__(self):
        self.logs: dict[str, list[dict]] = {}
        self.sessions: dict[str, dict] = {}
        self._admin_connections: list[asyncio.Queue] = []

    def register_admin(self) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        self._admin_connections.append(queue)
        return queue

    def unregister_admin(self, queue: asyncio.Queue):
        if queue in self._admin_connections:
            self._admin_connections.remove(queue)

    def create_session(self, session_id: str):
        self.sessions[session_id] = {
            "session_id": session_id,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "status": "active",
            "customer_name": None,
            "order_number": None,
        }
        self.logs[session_id] = []
        self._broadcast({
            "type": "session_created",
            "session": self.sessions[session_id],
        })

    def update_session(self, session_id: str, **kwargs):
        if session_id in self.sessions:
            self.sessions[session_id].update(kwargs)
            self._broadcast({
                "type": "session_updated",
                "session": self.sessions[session_id],
            })

    def end_session(self, session_id: str):
        if session_id in self.sessions:
            self.sessions[session_id]["status"] = "completed"
            self.sessions[session_id]["ended_at"] = datetime.now(timezone.utc).isoformat()
            self._broadcast({
                "type": "session_ended",
                "session": self.sessions[session_id],
            })

    def log(
        self,
        session_id: str,
        step_type: str,
        *,
        tool_name: str | None = None,
        tool_input: dict | None = None,
        tool_output: Any = None,
        message: str | None = None,
        reasoning: str | None = None,
        decision: str | None = None,
        policy_sections: list[int] | None = None,
    ):
        entry = {
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "step_type": step_type,
            "tool_name": tool_name,
            "input": tool_input,
            "output": _safe_serialize(tool_output),
            "message": message,
            "reasoning": reasoning,
            "decision": decision,
            "policy_sections": policy_sections,
        }
        if session_id not in self.logs:
            self.logs[session_id] = []
        self.logs[session_id].append(entry)
        self._broadcast({"type": "reasoning_log", "entry": entry})

    def get_session_logs(self, session_id: str) -> list[dict]:
        return self.logs.get(session_id, [])

    def get_all_sessions(self) -> list[dict]:
        return list(self.sessions.values())

    def _broadcast(self, data: dict):
        for queue in self._admin_connections:
            try:
                queue.put_nowait(data)
            except asyncio.QueueFull:
                pass


def _safe_serialize(obj: Any) -> Any:
    if obj is None:
        return None
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return str(obj)


reasoning_logger = ReasoningLogger()
