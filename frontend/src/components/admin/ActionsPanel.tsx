"use client";

import { useEffect, useRef } from "react";
import type { AgentAction } from "@/lib/types";

interface Props {
  actions: AgentAction[];
}

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; borderColor: string; icon: string }
> = {
  return_scheduled: {
    label: "Return Scheduled",
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    borderColor: "border-l-blue-500",
    icon: "return",
  },
  refund_approved: {
    label: "Refund Approved",
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    borderColor: "border-l-emerald-500",
    icon: "approve",
  },
  refund_denied: {
    label: "Refund Denied",
    color: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    borderColor: "border-l-red-500",
    icon: "deny",
  },
  escalated_to_human: {
    label: "Escalated to Human",
    color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    borderColor: "border-l-amber-500",
    icon: "escalate",
  },
  order_cancelled: {
    label: "Order Cancelled",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    borderColor: "border-l-gray-500",
    icon: "cancel",
  },
};

function ActionIcon({ type }: { type: string }) {
  const cls = "w-5 h-5";
  switch (type) {
    case "return":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      );
    case "approve":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "deny":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "escalate":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "cancel":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      );
    default:
      return null;
  }
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const upper = status.toUpperCase();
  let cls = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  if (["APPROVED", "COMPLETED", "RETURN_SCHEDULED"].includes(upper))
    cls = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
  else if (["DENIED", "CANCELLED"].includes(upper))
    cls = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  else if (["ESCALATED", "PENDING"].includes(upper))
    cls = "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${cls}`}>
      {upper}
    </span>
  );
}

export default function ActionsPanel({ actions }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [actions]);

  if (actions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 flex items-center justify-center border border-violet-200 dark:border-violet-800">
            <svg className="w-7 h-7 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No actions yet</p>
          <p className="text-xs text-gray-400 mt-1">
            When Zara processes refunds, schedules returns, or escalates cases, they will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-gray-50 dark:bg-gray-950">
      {actions.map((action, idx) => {
        const config = ACTION_CONFIG[action.action_type] || ACTION_CONFIG.order_cancelled;
        const details = action.details || {};

        return (
          <div
            key={action.id}
            className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden border-l-4 ${config.borderColor} animate-fade-in-up shadow-sm`}
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div className="px-5 py-4">
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-gray-500 dark:text-gray-400">
                    <ActionIcon type={config.icon} />
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${config.color}`}>
                    {config.label}
                  </span>
                  <StatusBadge status={action.status} />
                </div>
                <span className="text-[11px] text-gray-400 tabular-nums">
                  {new Date(action.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {action.refund_number && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Reference</span>
                    <p className="font-mono text-violet-600 dark:text-violet-400 font-semibold text-sm">
                      {action.refund_number}
                    </p>
                  </div>
                )}
                {action.order_number && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Order</span>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{action.order_number}</p>
                  </div>
                )}
                {action.customer_name && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Customer</span>
                    <p className="text-gray-800 dark:text-gray-200">{action.customer_name}</p>
                  </div>
                )}
                {action.customer_email && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Email</span>
                    <p className="text-gray-800 dark:text-gray-200">{action.customer_email}</p>
                  </div>
                )}
                {action.amount != null && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Amount</span>
                    <p className="text-gray-800 dark:text-gray-200 font-semibold">${action.amount.toFixed(2)}</p>
                  </div>
                )}
                {details.payment_method && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Payment</span>
                    <p className="text-gray-800 dark:text-gray-200 capitalize">
                      {String(details.payment_method).replace(/_/g, " ")}
                    </p>
                  </div>
                )}
                {details.return_shipping_paid_by && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Return Shipping</span>
                    <p className="text-gray-800 dark:text-gray-200 capitalize">
                      Paid by {String(details.return_shipping_paid_by)}
                    </p>
                  </div>
                )}
                {details.policy_sections_cited && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Policy Sections</span>
                    <p className="text-gray-800 dark:text-gray-200">
                      Sections {String(details.policy_sections_cited)}
                    </p>
                  </div>
                )}
              </div>

              {/* Message / reason */}
              {(details.message || details.violation_reasons || details.reason) && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {String(details.message || details.violation_reasons || details.reason)}
                  </p>
                </div>
              )}
            </div>

            {/* Session footer */}
            <div className="px-5 py-2 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400">
                Session: <span className="font-mono">{action.session_id}</span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
