"use client";

interface Props {
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
}

export default function VoiceOrb({ isSpeaking, isListening, isThinking }: Props) {
  const active = isSpeaking || isListening || isThinking;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      {/* Outer glow */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isSpeaking
            ? "bg-violet-500/30 scale-150 blur-xl"
            : isListening
            ? "bg-red-500/25 scale-130 blur-xl"
            : isThinking
            ? "bg-indigo-500/20 scale-120 blur-lg"
            : "bg-violet-500/10 scale-100 blur-lg"
        }`}
      />

      {/* Main orb */}
      <div className="relative w-14 h-14 rounded-full overflow-hidden">
        {/* Base gradient */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: isSpeaking
              ? "radial-gradient(circle at 35% 35%, #a78bfa, #7c3aed 40%, #4f46e5 60%, #06b6d4 80%, #ec4899 100%)"
              : isListening
              ? "radial-gradient(circle at 35% 35%, #f87171, #ef4444 40%, #dc2626 60%, #7c3aed 80%, #4f46e5 100%)"
              : isThinking
              ? "radial-gradient(circle at 35% 35%, #818cf8, #6366f1 40%, #4f46e5 60%, #7c3aed 80%, #a78bfa 100%)"
              : "radial-gradient(circle at 35% 35%, #8b5cf6, #6d28d9 40%, #4c1d95 60%, #1e1b4b 80%, #312e81 100%)",
            transition: "background 0.8s ease",
          }}
        />

        {/* Blob layer 1 */}
        <div
          className="absolute inset-0 rounded-full opacity-60"
          style={{
            background: "radial-gradient(circle at 65% 30%, #06b6d4, transparent 60%)",
            animation: active ? "orbFloat1 2s ease-in-out infinite" : "orbFloat1 6s ease-in-out infinite",
          }}
        />

        {/* Blob layer 2 */}
        <div
          className="absolute inset-0 rounded-full opacity-50"
          style={{
            background: "radial-gradient(circle at 30% 70%, #ec4899, transparent 60%)",
            animation: active ? "orbFloat2 2.5s ease-in-out infinite" : "orbFloat2 8s ease-in-out infinite",
          }}
        />

        {/* Blob layer 3 */}
        <div
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            background: "radial-gradient(circle at 70% 60%, #a78bfa, transparent 50%)",
            animation: active ? "orbFloat3 1.8s ease-in-out infinite" : "orbFloat3 7s ease-in-out infinite",
          }}
        />

        {/* Glass reflection */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.3), transparent 50%)",
          }}
        />

        {/* Pulse when active */}
        {active && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.1), transparent 70%)",
              animation: "orbPulse 1.5s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Status label */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span
          className={`text-[11px] font-medium tracking-wide transition-all duration-300 ${
            isSpeaking
              ? "text-violet-300"
              : isListening
              ? "text-red-300"
              : isThinking
              ? "text-indigo-300"
              : "text-gray-600"
          }`}
        >
          {isSpeaking ? "Speaking..." : isListening ? "Listening..." : isThinking ? "Thinking..." : "Ready"}
        </span>
      </div>

      <style jsx>{`
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(6px, -6px) scale(1.1); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-8px, 5px) scale(1.15); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(5px, 8px) scale(1.05); }
        }
        @keyframes orbPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
