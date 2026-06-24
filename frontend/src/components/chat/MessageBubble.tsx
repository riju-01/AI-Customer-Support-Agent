"use client";

import type { ChatMessage } from "@/lib/types";
import Image from "next/image";

interface Props {
  message: ChatMessage;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.type === "user";
  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      {!isUser && (
        <Image src="/avatar.jpg" alt="Zara" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm" />
      )}

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}

      <div className={`max-w-[78%] ${isUser ? "text-right" : ""}`}>
        {/* Attachments */}
        {hasAttachments && (
          <div className={`flex flex-wrap gap-1.5 mb-1.5 ${isUser ? "justify-end" : ""}`}>
            {message.attachments!.map((att, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                {att.type === "image" ? (
                  <a href={att.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={att.url}
                      alt="Attached image"
                      className="max-w-[240px] max-h-[200px] object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <video
                    src={att.url}
                    controls
                    className="max-w-[280px] max-h-[200px] rounded-xl"
                    preload="metadata"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Text content */}
        {message.content && message.content !== "(attached file)" && (
          <div
            className={`inline-block px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl rounded-br-md shadow-sm shadow-violet-500/20"
                : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 shadow-sm"
            }`}
          >
            {message.content}
          </div>
        )}

        <p className={`text-[10px] text-gray-400 mt-1 ${isUser ? "text-right mr-1" : "ml-1"}`}>
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
