"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentAction } from "@/app/api/agent/route";

// ---------------------------------------------------------------------------
// Types & Props
// ---------------------------------------------------------------------------

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  actions?: AgentAction[];
}

interface RepoAgentChatProps {
  repoUrl: string;
  files: string[];
  onFocusFiles?: (files: string[]) => void;
  onShowFunction?: (functionName: string) => void;
  onOpenDocsPage?: (slug: string) => void;
  onSelectQuestion?: (question: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RepoAgentChat({
  repoUrl,
  files,
  onFocusFiles,
  onShowFunction,
  onOpenDocsPage,
  onSelectQuestion,
}: RepoAgentChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am your Autonomous Codebase Agent for this repository. Ask me to perform complex refactorings, search architecture patterns, or generate automated reports.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      actions: [
        {
          label: "📖 Open Overview docs",
          payload: { type: "openDocsPage", data: { slug: "overview" } },
        },
        {
          label: "❓ Suggested questions",
          payload: {
            type: "suggestQuestions",
            data: { questions: ["What are the core modules?", "Where is CLI handling?"] },
          },
        },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function handleActionClick(action: AgentAction) {
    const { type, data } = action.payload;

    if (type === "focusFiles" && onFocusFiles) {
      const fileList = Array.isArray(data?.files) ? data.files : typeof data === "string" ? [data] : [];
      if (fileList.length > 0) onFocusFiles(fileList);
    } else if (type === "showFunction" && onShowFunction) {
      const fn = data?.functionName || data?.name || data;
      if (typeof fn === "string" && fn) onShowFunction(fn);
    } else if (type === "openDocsPage" && onOpenDocsPage) {
      const slug = data?.slug || data;
      if (typeof slug === "string" && slug) onOpenDocsPage(slug);
    } else if (type === "suggestQuestions") {
      const questions = Array.isArray(data?.questions) ? data.questions : Array.isArray(data) ? data : [];
      if (questions.length > 0 && onSelectQuestion) {
        onSelectQuestion(questions[0]);
      }
    }
  }

  async function handleSend(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const textToSend = customQuery || input.trim();
    if (!textToSend || sending) return;

    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    if (!customQuery) setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const json = await res.json();
      const replyText =
        res.ok && json.content
          ? json.content
          : `Got your message: '${textToSend}'.`;
      const replyActions = Array.isArray(json.actions) ? json.actions : [];

      const botMsg: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        actions: replyActions,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const botMsg: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Got your message: '${textToSend}'.`,
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
        height: "540px",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(251, 191, 36, 0.3)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
      }}
    >
      {/* Top Agent Header */}
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
          <span style={{ fontSize: "1.2rem" }}>🤖</span>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#fbbf24",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Repo Agent Chat
            </h3>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#94a3b8",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Autonomous Agent Mode • {files.length} codebase files
            </span>
          </div>
        </div>

        <span
          style={{
            fontSize: "0.7rem",
            padding: "0.15rem 0.45rem",
            borderRadius: "4px",
            background: "rgba(251, 191, 36, 0.15)",
            color: "#fbbf24",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            fontWeight: 700,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          READY
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
          gap: "1.1rem",
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
                gap: "0.3rem",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "0.75rem 1rem",
                  borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: isUser
                    ? "rgba(56, 189, 248, 0.2)"
                    : "rgba(30, 41, 59, 0.9)",
                  border: isUser
                    ? "1px solid rgba(56, 189, 248, 0.4)"
                    : "1px solid rgba(251, 191, 36, 0.3)",
                  color: isUser ? "#38bdf8" : "#f8fafc",
                  fontSize: "0.88rem",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  fontFamily: isUser ? "ui-monospace, monospace" : "inherit",
                }}
              >
                {msg.content}

                {/* Assistant Action Buttons */}
                {!isUser && msg.actions && msg.actions.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                      marginTop: "0.6rem",
                      paddingTop: "0.5rem",
                      borderTop: "1px solid rgba(51, 65, 85, 0.5)",
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {msg.actions.map((act, aIdx) => {
                        if (act.payload.type === "suggestQuestions") {
                          const qList: string[] = Array.isArray(act.payload.data?.questions)
                            ? act.payload.data.questions
                            : Array.isArray(act.payload.data)
                            ? act.payload.data
                            : [];

                          return (
                            <div key={aIdx} style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", width: "100%" }}>
                              {qList.map((qText, qIdx) => (
                                <button
                                  key={qIdx}
                                  onClick={() => handleSend(undefined, qText)}
                                  style={{
                                    padding: "0.35rem 0.65rem",
                                    borderRadius: "5px",
                                    background: "rgba(251, 191, 36, 0.12)",
                                    border: "1px solid rgba(251, 191, 36, 0.35)",
                                    color: "#fbbf24",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "ui-monospace, monospace",
                                    textAlign: "left",
                                  }}
                                >
                                  ❓ {qText}
                                </button>
                              ))}
                            </div>
                          );
                        }

                        return (
                          <button
                            key={aIdx}
                            onClick={() => handleActionClick(act)}
                            style={{
                              padding: "0.35rem 0.75rem",
                              borderRadius: "5px",
                              background: "rgba(251, 191, 36, 0.15)",
                              border: "1px solid rgba(251, 191, 36, 0.4)",
                              color: "#fbbf24",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "ui-monospace, monospace",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              transition: "background 0.2s, border-color 0.2s",
                            }}
                            onMouseOver={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "rgba(251, 191, 36, 0.3)";
                            }}
                            onMouseOut={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "rgba(251, 191, 36, 0.15)";
                            }}
                          >
                            ⚡ {act.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <span
                style={{
                  fontSize: "0.68rem",
                  color: "#64748b",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {isUser ? "You" : "Agent"} • {msg.timestamp}
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
              border: "1px solid rgba(251, 191, 36, 0.3)",
              color: "#fbbf24",
              fontSize: "0.82rem",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <span>⏳ Agent is processing request…</span>
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
          placeholder="Ask Agent to analyze, refactor, or suggest questions..."
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
            background: sending || !input.trim() ? "#334155" : "#fbbf24",
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
