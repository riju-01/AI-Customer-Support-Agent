"use client";

import { useEffect, useRef, useState } from "react";
import type { ReasoningLogEntry } from "@/lib/types";

interface Props {
  logs: ReasoningLogEntry[];
}

const STEP_CONFIG: Record<string, { label: string; color: string; borderColor: string; iconType: string }> = {
  llm_call: {
    label: "Thinking",
    color: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    borderColor: "border-l-violet-500",
    iconType: "brain",
  },
  tool_call: {
    label: "Tool Call",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    borderColor: "border-l-blue-500",
    iconType: "tool",
  },
  tool_result: {
    label: "Tool Result",
    color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    borderColor: "border-l-cyan-500",
    iconType: "result",
  },
  agent_response: {
    label: "Response",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    borderColor: "border-l-emerald-500",
    iconType: "chat",
  },
  user_message: {
    label: "Customer",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    borderColor: "border-l-gray-400",
    iconType: "user",
  },
  error: {
    label: "Error",
    color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    borderColor: "border-l-red-500",
    iconType: "error",
  },
  decision: {
    label: "Decision",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    borderColor: "border-l-amber-500",
    iconType: "decision",
  },
};

function StepIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  switch (type) {
    case "brain":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
    case "tool":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case "result":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
    case "chat":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
    case "user":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    case "error":
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.27 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>;
    default:
      return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;
  }
}

export default function ReasoningLog({ logs }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const toggleExpand = (index: number) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center animate-shimmer">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Waiting for activity...</p>
          <p className="text-xs text-gray-400 mt-1">Agent reasoning will stream here in real-time</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin bg-gray-50 dark:bg-gray-950">
      {logs.map((entry, idx) => {
        const config = STEP_CONFIG[entry.step_type] || STEP_CONFIG.decision;
        const isExpanded = expandedEntries.has(idx);
        const hasDetails = !!(entry.input || entry.output);

        let decisionBadge = null;
        if (entry.decision) {
          const isPositive = ["ELIGIBLE", "SUCCESS", "APPROVED", "COMPLETED"].includes(entry.decision);
          const isNegative = ["NOT_ELIGIBLE", "DENY", "HIGH_RISK", "BLOCK", "DENIED"].includes(entry.decision);
          decisionBadge = (
            <span
              className={`ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                isPositive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : isNegative
                  ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
              }`}
            >
              {entry.decision}
            </span>
          );
        }

        return (
          <div
            key={idx}
            className={`rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden border-l-[3px] ${config.borderColor} animate-fade-in-up`}
            style={{ animationDelay: `${idx * 20}ms` }}
          >
            <button
              onClick={() => hasDetails && toggleExpand(idx)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 ${
                hasDetails ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""
              } transition-colors`}
            >
              <span className="flex-shrink-0 text-gray-400">
                <StepIcon type={config.iconType} />
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${config.color}`}>
                {config.label}
              </span>
              {entry.tool_name && (
                <code className="text-[11px] font-mono text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded flex-shrink-0">
                  {entry.tool_name}
                </code>
              )}
              <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                {entry.message || entry.reasoning || ""}
              </span>
              {decisionBadge}
              <span className="text-[10px] text-gray-400 flex-shrink-0 tabular-nums">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              {hasDetails && (
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {isExpanded && hasDetails && (
              <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 bg-gray-50 dark:bg-gray-950">
                {entry.input && (
                  <div className="mb-2.5">
                    <span className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Input</span>
                    <pre className="mt-1 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg p-3 overflow-x-auto border border-gray-200 dark:border-gray-700 font-mono">
                      {JSON.stringify(entry.input, null, 2)}
                    </pre>
                  </div>
                )}
                {entry.output != null && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Output</span>
                    <pre className="mt-1 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 rounded-lg p-3 overflow-x-auto border border-gray-200 dark:border-gray-700 font-mono max-h-64 overflow-y-auto scrollbar-thin">
                      {typeof entry.output === "string" ? entry.output : JSON.stringify(entry.output, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
