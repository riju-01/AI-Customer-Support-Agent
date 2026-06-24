"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { startChat, sendMessage as sendChatMessage } from "@/lib/api";
import { useVoice } from "@/lib/useVoice";
import type { ChatMessage, Attachment } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import VoiceOrb from "./VoiceOrb";
import Image from "next/image";
import Link from "next/link";

export default function HomeClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const voice = useVoice();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAgentTyping, scrollToBottom]);

  const initChat = useCallback(async () => {
    setIsConnected(false);
    setIsAgentTyping(true);
    try {
      const data = await startChat();
      setSessionId(data.session_id);
      setIsConnected(true);
      setIsAgentTyping(false);
      setMessages([
        {
          id: `agent-${Date.now()}`,
          type: "agent",
          content: data.message,
          timestamp: new Date(),
        },
      ]);
      if (data.message) voice.speak(data.message);
    } catch {
      setIsAgentTyping(false);
      setIsConnected(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    initChat();
  }, [initChat]);

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    if (!sessionId || isSending) return;

    voice.stopSpeaking();

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        type: "user",
        content,
        timestamp: new Date(),
        attachments,
      },
    ]);

    setIsSending(true);

    await sendChatMessage(
      sessionId,
      content,
      () => setIsAgentTyping(true),
      (agentContent) => {
        setIsAgentTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            type: "agent",
            content: agentContent,
            timestamp: new Date(),
          },
        ]);
        voice.speak(agentContent);
      },
      () => {
        setIsSending(false);
        setIsAgentTyping(false);
      },
      (err) => {
        console.error("Chat error:", err);
        setIsSending(false);
        setIsAgentTyping(false);
      }
    );
  };

  const reconnect = () => {
    setMessages([]);
    setSessionId(null);
    setIsSending(false);
    voice.stopSpeaking();
    initChat();
  };

  return (
    <main className="h-screen flex bg-gradient-to-br from-violet-950 via-gray-950 to-indigo-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-600 opacity-10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600 opacity-10 blur-[120px] pointer-events-none" />

      {/* Left side — Zara presence with big avatar + small orb */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative px-12">
        <div className="absolute w-72 h-72 rounded-full bg-violet-500 opacity-15 blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Big avatar */}
          <div className="relative mb-6">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 opacity-30 blur-md animate-pulse" />
            <div className="relative w-52 h-52 rounded-full ring-4 ring-violet-400/30 overflow-hidden shadow-2xl shadow-violet-500/20">
              <Image
                src="/avatar.jpg"
                alt="Zara"
                fill
                className="object-cover"
                priority
              />
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-emerald-400 border-[3px] border-gray-950 shadow-lg shadow-emerald-500/50" />
          </div>

          {/* Name & title */}
          <h1 className="text-4xl font-bold text-white tracking-tight mb-1">Zara</h1>
          <p className="text-violet-300 text-lg font-medium mb-5">ShopEase Support Agent</p>

          {/* Small voice orb */}
          <div className="mb-10">
            <VoiceOrb
              isSpeaking={voice.isSpeaking}
              isListening={voice.isListening}
              isThinking={isAgentTyping}
            />
          </div>

          {/* Status card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4 max-w-xs text-center">
            <p className="text-gray-300 text-sm leading-relaxed">
              Hi! I&apos;m Zara, your AI support agent. I can help you with refunds, returns, order cancellations, and more.
            </p>
          </div>

          {/* Capability pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-sm">
            {["Refunds", "Returns", "Cancellations", "Order Tracking", "Policy Questions"].map((cap) => (
              <span
                key={cap}
                className="px-3 py-1.5 text-xs font-medium bg-white/5 border border-white/10 rounded-full text-violet-200"
              >
                {cap}
              </span>
            ))}
          </div>

          {/* Powered by badge */}
          <div className="mt-8 flex items-center gap-2 text-gray-500 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            <span>Powered by AI &middot; ShopEase</span>
          </div>
        </div>
      </div>

      {/* Right side — Chat */}
      <div className="flex-1 max-w-xl flex flex-col h-screen lg:py-4 lg:pr-4">
        <div className="flex-1 rounded-none lg:rounded-2xl shadow-2xl shadow-black/30 overflow-hidden border-0 lg:border border-white/10 bg-white dark:bg-gray-900 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-violet-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Image src="/avatar.jpg" alt="Zara" width={40} height={40} className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30" />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-violet-600 ${
                    isConnected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                  }`}
                />
              </div>
              <div>
                <h1 className="text-base font-semibold text-white tracking-tight">Zara</h1>
                <p className="text-[11px] text-violet-200">
                  {voice.isSpeaking ? "Speaking..." : isConnected ? "ShopEase Support Agent" : "Connecting..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {voice.ttsAvailable && (
                <button
                  onClick={voice.toggleVoice}
                  className={`p-2 rounded-lg transition-all ${
                    voice.voiceEnabled
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/50"
                  }`}
                  title={voice.voiceEnabled ? "Voice on — click to mute" : "Voice off — click to enable"}
                >
                  {voice.voiceEnabled ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8l5.7-4.3v15l-5.7-4.3H3.3c-.7 0-1.3-.6-1.3-1.3v-4.8c0-.7.6-1.3 1.3-1.3h3.2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  )}
                </button>
              )}
              <button
                onClick={reconnect}
                className="px-3.5 py-1.5 text-xs font-semibold text-violet-700 bg-white rounded-lg hover:bg-violet-50 transition-all shadow-sm"
              >
                New Chat
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-thin bg-gray-50 dark:bg-gray-900/50">
            {messages.length === 0 && !isAgentTyping && (
              <div className="text-center mt-20 animate-fade-in-up">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Starting your session with Zara...</p>
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={msg.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                <MessageBubble message={msg} />
              </div>
            ))}

            {isAgentTyping && (
              <div className="flex items-end gap-2.5 animate-fade-in-up">
                <Image src="/avatar.jpg" alt="Zara" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0 shadow-sm" />
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce opacity-70" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce opacity-70" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce opacity-70" style={{ animationDelay: "300ms" }} />
                    <span className="text-[11px] text-gray-400 ml-1.5">Zara is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && isConnected && (
            <div className="px-4 pb-2 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2 px-1">Quick actions</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "I want a refund", icon: "↩" },
                  { label: "Cancel my order", icon: "✕" },
                  { label: "Track my package", icon: "📦" },
                  { label: "Damaged item", icon: "⚠" },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.label)}
                    disabled={!isConnected || isSending}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all disabled:opacity-50"
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            disabled={!isConnected || isSending}
            isListening={voice.isListening}
            sttAvailable={voice.sttAvailable}
            onMicClick={() => {
              if (voice.isListening) {
                voice.stopListening();
              } else {
                voice.startListening((text) => handleSend(text));
              }
            }}
          />
        </div>
      </div>

      {/* Admin link */}
      <Link
        href="/admin"
        className="fixed bottom-5 left-5 z-20 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-sm font-medium text-gray-400 hover:text-violet-300 hover:border-violet-500/40 transition-all"
      >
        Admin Panel
      </Link>
    </main>
  );
}
