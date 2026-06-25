"use client";

import { useState, useEffect, useCallback } from "react";
import { createAdminStream, fetchSessionLogs } from "@/lib/api";
import type { Session, ReasoningLogEntry, AgentAction } from "@/lib/types";
import SessionList from "./SessionList";
import ReasoningLog from "./ReasoningLog";
import ActionsPanel from "./ActionsPanel";
import Image from "next/image";

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, ReasoningLogEntry[]>>({});
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [activeTab, setActiveTab] = useState<"logs" | "actions">("logs");
  const [connected, setConnected] = useState(false);

  const handleEvent = useCallback((eventType: string, data: Record<string, unknown>) => {
    switch (eventType) {
      case "init":
        if (data.sessions) setSessions(data.sessions as Session[]);
        break;
      case "session_created":
        if (data.session) {
          const s = (data as { session: Session }).session;
          setSessions((prev) => [s, ...prev]);
          setSelectedSession(s.session_id);
        }
        break;
      case "session_updated":
        if (data.session) {
          const s = (data as { session: Session }).session;
          setSessions((prev) => prev.map((x) => (x.session_id === s.session_id ? s : x)));
        }
        break;
      case "session_ended":
        if (data.session) {
          const s = (data as { session: Session }).session;
          setSessions((prev) => prev.map((x) => (x.session_id === s.session_id ? s : x)));
        }
        break;
      case "reasoning_log":
        if (data.entry) {
          const entry = data.entry as ReasoningLogEntry;
          setLogs((prev) => ({
            ...prev,
            [entry.session_id]: [...(prev[entry.session_id] || []), entry],
          }));
        }
        break;
      case "agent_action":
        if (data.action) {
          setActions((prev) => [...prev, data.action as AgentAction]);
        }
        break;
    }
  }, []);

  useEffect(() => {
    const es = createAdminStream(handleEvent);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [handleEvent]);

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSession(sessionId);
    if (!logs[sessionId] || logs[sessionId].length === 0) {
      try {
        const sessionLogs = await fetchSessionLogs(sessionId);
        setLogs((prev) => ({ ...prev, [sessionId]: sessionLogs }));
      } catch {
        /* new session */
      }
    }
  };

  const selectedLogs = selectedSession ? logs[selectedSession] || [] : [];
  const selectedSessionData = sessions.find((s) => s.session_id === selectedSession);
  const activeSessions = sessions.filter((s) => s.status === "active").length;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
        {/* Logo header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <Image src="/avatar.jpg" alt="Zara" width={36} height={36} className="w-9 h-9 rounded-lg object-cover shadow-sm" />
            <div>
              <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 tracking-tight">Zara Admin</h1>
              <p className="text-[11px] text-gray-400">Agent Reasoning Monitor</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{sessions.length}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sessions</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{activeSessions}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Active</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{actions.length}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Actions</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`} />
                <p className={`text-sm font-semibold ${connected ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {connected ? "Live" : "Off"}
                </p>
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Stream</p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-3 pb-1.5">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Sessions</p>
        </div>
        <SessionList sessions={sessions} selectedSession={selectedSession} onSelect={handleSelectSession} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === "logs"
                ? "border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Reasoning Logs
            </span>
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === "actions"
                ? "border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Agent Actions
              {actions.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                  {actions.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {activeTab === "logs" ? (
          <>
            {selectedSession ? (
              <>
                {/* Session header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Image src="/avatar.jpg" alt="Zara" width={40} height={40} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                            Session {selectedSession}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              selectedSessionData?.status === "active"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              selectedSessionData?.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                            }`} />
                            {selectedSessionData?.status || "unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                          {selectedSessionData?.customer_name && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              {selectedSessionData.customer_name}
                            </span>
                          )}
                          {selectedSessionData?.order_number && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                              {selectedSessionData.order_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{selectedLogs.length}</span>
                      <span className="text-xs text-gray-400 ml-1">log entries</span>
                    </div>
                  </div>
                </div>
                <ReasoningLog logs={selectedLogs} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center border border-violet-200 dark:border-violet-800">
                    <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">No session selected</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select a session from the sidebar or start a new chat</p>
                  <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                    {connected ? "Live stream connected — waiting for activity" : "Stream disconnected"}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <ActionsPanel actions={actions} />
        )}
      </div>
    </div>
  );
}
