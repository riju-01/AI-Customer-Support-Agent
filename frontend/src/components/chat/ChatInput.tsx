"use client";

import { useState, useRef, useEffect } from "react";
import type { Attachment } from "@/lib/types";
import { uploadFile } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
  onSend: (message: string, attachments?: Attachment[]) => void;
  disabled: boolean;
  isListening?: boolean;
  sttAvailable?: boolean;
  onMicClick?: () => void;
}

export default function ChatInput({ onSend, disabled, isListening, sttAvailable, onMicClick }: Props) {
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string; type: "image" | "video" }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isListening) inputRef.current?.focus();
  }, [disabled, isListening]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && pendingFiles.length === 0) || disabled) return;

    let attachments: Attachment[] | undefined;

    if (pendingFiles.length > 0) {
      setIsUploading(true);
      const uploaded: Attachment[] = [];
      for (const pf of pendingFiles) {
        const result = await uploadFile(pf.file);
        if (result) {
          uploaded.push({
            url: `${API_BASE}${result.url}`,
            type: pf.type,
            filename: result.filename,
          });
        }
        URL.revokeObjectURL(pf.preview);
      }
      setIsUploading(false);
      if (uploaded.length > 0) attachments = uploaded;
      setPendingFiles([]);
    }

    onSend(trimmed || "(attached file)", attachments);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video/") ? "video" as const : "image" as const,
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 bg-white dark:bg-gray-900">
      {/* File previews */}
      {pendingFiles.length > 0 && (
        <div className="flex gap-2 mb-2.5 overflow-x-auto pb-1">
          {pendingFiles.map((pf, i) => (
            <div key={i} className="relative flex-shrink-0 group">
              {pf.type === "image" ? (
                <img
                  src={pf.preview}
                  alt="Attachment"
                  className="w-[72px] h-[72px] rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-[72px] h-[72px] rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

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

        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20 dark:hover:text-violet-400 transition-all flex-shrink-0 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Attach photo or video"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isListening || isUploading}
          placeholder={isUploading ? "Uploading..." : isListening ? "Listening..." : disabled ? "Connecting to Zara..." : "Type your message..."}
          rows={1}
          className={`flex-1 resize-none rounded-xl border px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 disabled:opacity-50 transition-all ${
            isListening
              ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          }`}
        />

        <button
          onClick={handleSend}
          disabled={disabled || isUploading || (!input.trim() && pendingFiles.length === 0)}
          className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-2">
        {isUploading ? "Uploading files..." : isListening ? "Speak now — Zara is listening..." : "Zara is an AI agent. Responses are based on ShopEase refund policy."}
      </p>
    </div>
  );
}
