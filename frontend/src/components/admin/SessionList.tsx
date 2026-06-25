"use client";

import type { Session } from "@/lib/types";

interface Props {
  sessions: Session[];
  selectedSession: string | null;
  onSelect: (sessionId: string) => void;
}

export default function SessionList({ sessions, selectedSession, onSelect }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center border border-gray-100 dark:border-gray-700">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No sessions yet</p>
          <p className="text-xs text-gray-400 mt-1">Sessions appear when customers chat with Zara</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      {sessions.map((session) => {
        const isActive = selectedSession === session.session_id;
        return (
          <button
            key={session.session_id}
            onClick={() => onSelect(session.session_id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 transition-all ${
              isActive
                ? "bg-violet-50 dark:bg-violet-900/20 border-l-2 border-l-violet-500"
                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-sm font-medium truncate ${isActive ? "text-violet-700 dark:text-violet-400" : "text-gray-800 dark:text-gray-200"}`}>
                {session.customer_name || `Session ${session.session_id.slice(0, 8)}`}
              </span>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  session.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
              {session.order_number && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  {session.order_number}
                </span>
              )}
              <span className="text-gray-400">
                {new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
