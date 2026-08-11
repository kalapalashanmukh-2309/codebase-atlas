"use client";

import { type DocsPage } from "@/lib/docs-pages";
import { type GraphMode } from "@/lib/graph-builder";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DocsPageViewModalProps {
  page: DocsPage;
  onClose: () => void;
  onOpenInGraph: (graphMode: GraphMode, focusFiles: string[]) => void;
  onSelectQuestion: (question: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocsPageViewModal({
  page,
  onClose,
  onOpenInGraph,
  onSelectQuestion,
}: DocsPageViewModalProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(10px)",
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "42rem",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "14px",
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          boxShadow:
            "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 24px rgba(56, 189, 248, 0.12)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(3, 7, 18, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>📖</span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: "#f8fafc",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {page.title}
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#38bdf8",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                /doc={page.slug}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: "1.25rem",
              cursor: "pointer",
              padding: "0.2rem 0.5rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {/* Summary Card */}
          <div
            style={{
              padding: "1rem 1.1rem",
              borderRadius: "8px",
              background: "rgba(3, 7, 18, 0.7)",
              border: "1px solid rgba(51, 65, 85, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                Summary & Architecture
              </span>

              <span
                style={{
                  fontSize: "0.68rem",
                  padding: "0.15rem 0.4rem",
                  borderRadius: "4px",
                  fontWeight: 700,
                  fontFamily: "ui-monospace, monospace",
                  textTransform: "uppercase",
                  background:
                    page.graphMode === "detailed"
                      ? "rgba(52, 211, 153, 0.15)"
                      : "rgba(99, 102, 241, 0.15)",
                  color:
                    page.graphMode === "detailed" ? "#34d399" : "#818cf8",
                  border: `1px solid ${
                    page.graphMode === "detailed"
                      ? "rgba(52, 211, 153, 0.35)"
                      : "rgba(99, 102, 241, 0.35)"
                  }`,
                }}
              >
                {page.graphMode} mode
              </span>
            </div>

            <p style={{ margin: 0, fontSize: "0.92rem", color: "#e2e8f0", lineHeight: 1.55 }}>
              {page.summary}
            </p>
          </div>

          {/* Focused Subgraph Files Section */}
          {page.focusFiles && page.focusFiles.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                padding: "0.9rem 1.1rem",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#38bdf8",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                🎯 Focused Subgraph Files ({page.focusFiles.length})
              </span>

              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {page.focusFiles.map((file) => (
                  <span
                    key={file}
                    style={{
                      fontSize: "0.78rem",
                      padding: "0.25rem 0.55rem",
                      borderRadius: "5px",
                      background: "rgba(3, 7, 18, 0.9)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      color: "#f8fafc",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    📄 {file}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Questions Section */}
          {page.suggestedQuestions && page.suggestedQuestions.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                padding: "0.9rem 1.1rem",
                borderRadius: "8px",
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(51, 65, 85, 0.5)",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#cbd5e1",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                💡 Suggested Questions (Click to Prefill Q&A)
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {page.suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectQuestion(q);
                      onClose();
                    }}
                    style={{
                      textAlign: "left",
                      padding: "0.45rem 0.7rem",
                      borderRadius: "6px",
                      background: "rgba(3, 7, 18, 0.8)",
                      border: "1px solid rgba(51, 65, 85, 0.6)",
                      color: "#38bdf8",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      fontFamily: "ui-monospace, monospace",
                      lineHeight: 1.4,
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(56, 189, 248, 0.5)";
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(15, 23, 42, 1)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(51, 65, 85, 0.6)";
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(3, 7, 18, 0.8)";
                    }}
                  >
                    👉 {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid rgba(51, 65, 85, 0.4)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(3, 7, 18, 0.4)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "6px",
              border: "1px solid rgba(51, 65, 85, 0.6)",
              background: "transparent",
              color: "#94a3b8",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Close
          </button>

          <button
            onClick={() => {
              onOpenInGraph(page.graphMode, page.focusFiles || []);
              onClose();
            }}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: "6px",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "ui-monospace, monospace",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            🎯 Open in graph →
          </button>
        </div>
      </div>
    </div>
  );
}
