"use client";

import { useState, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types & Props
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface RepoNavigatorChatProps {
  repoUrl: string;
  files: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RepoNavigatorChat({
  repoUrl,
  files,
}: RepoNavigatorChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am your Navigator assistant for this repository. Ask me anything about module dependencies, entry points, or codebase architecture.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim() || sending) return;

    const userText = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, question: userText }),
      });

      const json = await res.json();
      const replyText =
        res.ok && json.answer
          ? json.answer
          : `Got your message: "${userText}". I'm analyzing ${files.length} repository files.`;

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Got your message: "${userText}".`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "520px",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
      }}
    >
      {/* Top Chat Header */}
      <div
        style={{
          padding: "1rem 1.25rem",
          background: "rgba(3, 7, 18, 0.6)",
          borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.2rem" }}>🧭</span>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#f8fafc",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Repo Navigator Chat
            </h3>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#94a3b8",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Scoped to {files.length} codebase files
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: "0.7rem",
            padding: "0.15rem 0.45rem",
            borderRadius: "4px",
            background: "rgba(52, 211, 153, 0.15)",
            color: "#34d399",
            border: "1px solid rgba(52, 211, 153, 0.3)",
            fontWeight: 700,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          ONLINE
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          padding: "1.25rem",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                gap: "0.25rem",
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  padding: "0.75rem 1rem",
                  borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: isUser
                    ? "rgba(56, 189, 248, 0.2)"
                    : "rgba(30, 41, 59, 0.9)",
                  border: isUser
                    ? "1px solid rgba(56, 189, 248, 0.4)"
                    : "1px solid rgba(51, 65, 85, 0.6)",
                  color: isUser ? "#38bdf8" : "#f8fafc",
                  fontSize: "0.88rem",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  fontFamily: isUser ? "ui-monospace, monospace" : "inherit",
                }}
              >
                {msg.content}
              </div>
              <span
                style={{
                  fontSize: "0.68rem",
                  color: "#64748b",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {isUser ? "You" : "Navigator"} • {msg.timestamp}
              </span>
            </div>
          );
        })}

        {sending && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "0.6rem 0.9rem",
              borderRadius: "12px 12px 12px 2px",
              background: "rgba(30, 41, 59, 0.6)",
              border: "1px solid rgba(51, 65, 85, 0.4)",
              color: "#94a3b8",
              fontSize: "0.82rem",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <span>⏳ Navigator is thinking…</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Box Bar */}
      <form
        onSubmit={handleSend}
        style={{
          padding: "0.85rem 1.25rem",
          background: "rgba(3, 7, 18, 0.6)",
          borderTop: "1px solid rgba(51, 65, 85, 0.4)",
          display: "flex",
          gap: "0.75rem",
        }}
      >
        <input
          type="text"
          placeholder="Ask Navigator about this repo..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          style={{
            flex: 1,
            padding: "0.65rem 0.85rem",
            borderRadius: "6px",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(51, 65, 85, 0.6)",
            color: "#f8fafc",
            fontSize: "0.85rem",
            fontFamily: "ui-monospace, monospace",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "6px",
            background: sending || !input.trim() ? "#334155" : "#38bdf8",
            color: sending || !input.trim() ? "#94a3b8" : "#0f172a",
            fontWeight: 700,
            fontSize: "0.85rem",
            border: "none",
            cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
