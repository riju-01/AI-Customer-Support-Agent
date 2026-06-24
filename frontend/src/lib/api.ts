const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function startChat(): Promise<{ session_id: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/chat/start`, { method: "POST" });
  return res.json();
}

export async function sendMessage(
  sessionId: string,
  message: string,
  onTyping: () => void,
  onMessage: (content: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  try {
    const res = await fetch(`${API_BASE}/api/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message }),
    });

    if (!res.ok || !res.body) {
      onError("Failed to send message");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          switch (eventType) {
            case "typing":
              onTyping();
              break;
            case "message":
              onMessage(data.content);
              break;
            case "done":
              onDone();
              break;
          }
        }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : "Unknown error");
  }
}

export function createAdminStream(
  onEvent: (eventType: string, data: Record<string, unknown>) => void
): EventSource {
  const es = new EventSource(`${API_BASE}/api/admin/stream`);

  es.addEventListener("init", (e) => {
    onEvent("init", JSON.parse((e as MessageEvent).data));
  });
  es.addEventListener("session_created", (e) => {
    onEvent("session_created", JSON.parse((e as MessageEvent).data));
  });
  es.addEventListener("session_updated", (e) => {
    onEvent("session_updated", JSON.parse((e as MessageEvent).data));
  });
  es.addEventListener("session_ended", (e) => {
    onEvent("session_ended", JSON.parse((e as MessageEvent).data));
  });
  es.addEventListener("reasoning_log", (e) => {
    onEvent("reasoning_log", JSON.parse((e as MessageEvent).data));
  });
  es.addEventListener("ping", () => {});

  return es;
}

export async function fetchSessions() {
  const res = await fetch(`${API_BASE}/api/admin/sessions`);
  return res.json();
}

export async function fetchSessionLogs(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/admin/sessions/${sessionId}/logs`);
  return res.json();
}

export async function fetchCustomers() {
  const res = await fetch(`${API_BASE}/api/admin/customers`);
  return res.json();
}

export async function fetchCustomer(customerId: number) {
  const res = await fetch(`${API_BASE}/api/admin/customers/${customerId}`);
  return res.json();
}

export async function uploadFile(file: File): Promise<{ filename: string; url: string; type: string } | null> {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/uploads`, { method: "POST", body: form });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function checkVoiceStatus(): Promise<{ enabled: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/voice/status`);
    return res.json();
  } catch {
    return { enabled: false };
  }
}

export async function speakText(text: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${API_BASE}/api/voice/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}
