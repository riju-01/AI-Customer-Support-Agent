"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
  isListening?: boolean;
  sttAvailable?: boolean;
  onMicClick?: () => void;
}

export default function ChatInput({ onSend, disabled, isListening, sttAvailable, onMicClick }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isListening) inputRef.current?.focus();
  }, [disabled, isListening]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 bg-white dark:bg-gray-900">
      <div className="flex items-end gap-2">
        {/* Mic button */}
        {sttAvailable && (
          <button
            onClick={onMicClick}
            disabled={disabled}
            className={`p-2.5 rounded-xl transition-all flex-shrink-0 active:scale-95 ${
              isListening
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20 dark:hover:text-violet-400"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isListening ? "Stop listening" : "Speak to Zara"}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}

        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isListening}
          placeholder={isListening ? "Listening..." : disabled ? "Connecting to Zara..." : "Type your message..."}
          rows={1}
          className={`flex-1 resize-none rounded-xl border px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 disabled:opacity-50 transition-all ${
            isListening
              ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          }`}
        />

        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2">
        {isListening ? "Speak now — Zara is listening..." : "Zara is an AI agent. Responses are based on ShopEase refund policy."}
      </p>
    </div>
  );
}
