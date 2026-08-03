"use client";

import { useState, useRef, useEffect } from "react";
import type { AgentAction, ChangePlan, PRExplanation } from "@/app/api/agent/route";

// ---------------------------------------------------------------------------
// Types & Props
// ---------------------------------------------------------------------------

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  actions?: AgentAction[];
  changePlan?: ChangePlan;
  prExplanation?: PRExplanation;
}

interface RepoAgentChatProps {
  repoUrl: string;
  files: string[];
  onFocusFiles?: (files: string[]) => void;
  onShowFunction?: (functionName: string) => void;
  onOpenDocsPage?: (slug: string) => void;
  onSelectQuestion?: (question: string) => void;
  onOpenFile?: (filePath: string) => void;
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
  onOpenFile,
}: RepoAgentChatProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am your Autonomous Codebase Agent. Ask me to explain a PR (e.g. \"Explain this PR\"), plan a change (e.g. \"I want to add rate limiting\"), or inspect modules.",
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
            data: { questions: ["Explain this PR", "I want to add rate limiting"] },
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
    } else if (type === "focusStepFiles" && onFocusFiles) {
      const fileList = Array.isArray(data?.files) ? data.files : [];
      if (fileList.length > 0) onFocusFiles(fileList);
    } else if (type === "openFile" && onOpenFile) {
      const filePath = data?.path || data?.file || data;
      if (typeof filePath === "string" && filePath) {
        if (onFocusFiles) onFocusFiles([filePath]);
        onOpenFile(filePath);
      }
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
      const replyChangePlan = json.changePlan as ChangePlan | undefined;
      const replyPRExplanation = json.prExplanation as PRExplanation | undefined;

      const botMsg: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        actions: replyActions,
        changePlan: replyChangePlan,
        prExplanation: replyPRExplanation,
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
        height: "560px",
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
              Repo Agent & PR Explainer
            </h3>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#94a3b8",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              PR Explainer & Change Planning • {files.length} codebase files
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
          AGENT READY
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
                  maxWidth: "88%",
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

                {/* Structured PR Explanation Card */}
                {!isUser && msg.prExplanation && (
                  <div
                    style={{
                      marginTop: "0.85rem",
                      padding: "1rem",
                      borderRadius: "8px",
                      background: "rgba(3, 7, 18, 0.75)",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "1rem" }}>🔍</span>
                      <strong style={{ color: "#38bdf8", fontSize: "0.88rem", fontFamily: "ui-monospace, monospace" }}>
                        PR & Diff Explanation
                      </strong>
                    </div>

                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                      {msg.prExplanation.summary}
                    </p>

                    {/* Affected Modules */}
                    {msg.prExplanation.affectedModules && msg.prExplanation.affectedModules.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#cbd5e1",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          📁 Affected Modules ({msg.prExplanation.affectedModules.length})
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                          {msg.prExplanation.affectedModules.map((mod, mIdx) => (
                            <button
                              key={mIdx}
                              onClick={() => {
                                if (onFocusFiles) onFocusFiles([mod]);
                                if (onOpenFile) onOpenFile(mod);
                              }}
                              style={{
                                padding: "0.18rem 0.5rem",
                                borderRadius: "4px",
                                background: "rgba(56, 189, 248, 0.15)",
                                border: "1px solid rgba(56, 189, 248, 0.35)",
                                color: "#38bdf8",
                                fontSize: "0.74rem",
                                fontFamily: "ui-monospace, monospace",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              📄 {mod}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Changes */}
                    {msg.prExplanation.keyChanges && msg.prExplanation.keyChanges.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#34d399",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          🔍 Key Changes
                        </span>
                        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.8rem", color: "#e2e8f0", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          {msg.prExplanation.keyChanges.map((change, cIdx) => (
                            <li key={cIdx}>{change}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risks & Reviewer Notes */}
                    {msg.prExplanation.risks && msg.prExplanation.risks.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#fbbf24",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          ⚠️ Risks & Reviewer Notes
                        </span>
                        <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.8rem", color: "#fef08a", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          {msg.prExplanation.risks.map((risk, rIdx) => (
                            <li key={rIdx}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* PR Action Buttons */}
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                      {msg.prExplanation.affectedModules && msg.prExplanation.affectedModules.length > 0 && (
                        <button
                          onClick={() => onFocusFiles && onFocusFiles(msg.prExplanation!.affectedModules)}
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "4px",
                            background: "rgba(56, 189, 248, 0.15)",
                            border: "1px solid rgba(56, 189, 248, 0.4)",
                            color: "#38bdf8",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          🎯 Show affected files in graph
                        </button>
                      )}

                      <button
                        onClick={() => onOpenDocsPage && onOpenDocsPage("overview")}
                        style={{
                          padding: "0.2rem 0.55rem",
                          borderRadius: "4px",
                          background: "rgba(52, 211, 153, 0.15)",
                          border: "1px solid rgba(52, 211, 153, 0.4)",
                          color: "#34d399",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "ui-monospace, monospace",
                        }}
                      >
                        📖 Open related docs
                      </button>
                    </div>
                  </div>
                )}

                {/* Structured Change Plan Card */}
                {!isUser && msg.changePlan && (
                  <div
                    style={{
                      marginTop: "0.85rem",
                      padding: "1rem",
                      borderRadius: "8px",
                      background: "rgba(3, 7, 18, 0.75)",
                      border: "1px solid rgba(251, 191, 36, 0.4)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "1rem" }}>📋</span>
                      <strong style={{ color: "#fbbf24", fontSize: "0.88rem", fontFamily: "ui-monospace, monospace" }}>
                        Implementation Plan Summary
                      </strong>
                    </div>

                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#e2e8f0", lineHeight: 1.5 }}>
                      {msg.changePlan.summary}
                    </p>

                    {/* Step-by-step instructions */}
                    {msg.changePlan.steps && msg.changePlan.steps.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#38bdf8",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          Step-By-Step Instructions ({msg.changePlan.steps.length})
                        </span>

                        {msg.changePlan.steps.map((step, sIdx) => (
                          <div
                            key={sIdx}
                            style={{
                              padding: "0.6rem 0.85rem",
                              borderRadius: "6px",
                              background: "rgba(15, 23, 42, 0.85)",
                              border: "1px solid rgba(51, 65, 85, 0.6)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.35rem",
                            }}
                          >
                            <span style={{ fontSize: "0.83rem", fontWeight: 700, color: "#f8fafc" }}>
                              {step.title}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                              {step.description}
                            </span>

                            {/* Clickable file chips */}
                            {step.files && step.files.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.2rem" }}>
                                {step.files.map((file, fIdx) => (
                                  <button
                                    key={fIdx}
                                    onClick={() => {
                                      if (onFocusFiles) onFocusFiles([file]);
                                      if (onOpenFile) onOpenFile(file);
                                    }}
                                    style={{
                                      padding: "0.18rem 0.5rem",
                                      borderRadius: "4px",
                                      background: "rgba(56, 189, 248, 0.15)",
                                      border: "1px solid rgba(56, 189, 248, 0.35)",
                                      color: "#38bdf8",
                                      fontSize: "0.74rem",
                                      fontFamily: "ui-monospace, monospace",
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    📄 {file}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Action buttons per step */}
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                              {step.files && step.files.length > 0 && (
                                <button
                                  onClick={() => onFocusFiles && onFocusFiles(step.files)}
                                  style={{
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "4px",
                                    background: "rgba(56, 189, 248, 0.15)",
                                    border: "1px solid rgba(56, 189, 248, 0.4)",
                                    color: "#38bdf8",
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "ui-monospace, monospace",
                                  }}
                                >
                                  🎯 Show step files in graph
                                </button>
                              )}

                              <button
                                onClick={() => onOpenDocsPage && onOpenDocsPage("overview")}
                                style={{
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "4px",
                                  background: "rgba(52, 211, 153, 0.15)",
                                  border: "1px solid rgba(52, 211, 153, 0.4)",
                                  color: "#34d399",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "ui-monospace, monospace",
                                }}
                              >
                                📖 Open relevant docs
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Risks Section */}
                    {msg.changePlan.risks && msg.changePlan.risks.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: "#fbbf24",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          ⚠️ Risks & Watch Items
                        </span>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "1.1rem",
                            fontSize: "0.8rem",
                            color: "#fef08a",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.2rem",
                          }}
                        >
                          {msg.changePlan.risks.map((risk, rIdx) => (
                            <li key={rIdx}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

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
            <span>⏳ Agent is analyzing PR / diff request…</span>
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
          placeholder="Explain this PR, plan a change, or ask a question..."
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
          Submit
        </button>
      </form>
    </div>
  );
}
