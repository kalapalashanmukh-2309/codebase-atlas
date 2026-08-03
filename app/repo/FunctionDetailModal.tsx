"use client";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FunctionDetailInfo {
  name: string;
  definitions: {
    file: string;
    lineStart: number;
    lineEnd?: number;
    isExport: boolean;
  }[];
  callSites: {
    file: string;
    line: number;
    callerFunction?: string;
  }[];
  callCount: number;
}

interface FunctionDetailModalProps {
  functionName: string;
  detail?: FunctionDetailInfo;
  onClose: () => void;
  onOpenInGraph: (graphMode: "high-level" | "detailed", focusFiles: string[]) => void;
  onJumpToCode: (file: string, startLine: number, endLine: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FunctionDetailModal({
  functionName,
  detail,
  onClose,
  onOpenInGraph,
  onJumpToCode,
}: FunctionDetailModalProps) {
  const definitions = detail?.definitions || [];
  const callSites = detail?.callSites || [];
  const callCount = detail?.callCount || callSites.length;

  const defFiles = definitions.map((d) => d.file);
  const callerFiles = callSites.map((c) => c.file);
  const allFiles = Array.from(new Set([...defFiles, ...callerFiles]));

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
          border: "1px solid rgba(56, 189, 248, 0.35)",
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.25rem" }}>⚡</span>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  color: "#38bdf8",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {functionName}()
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  color: "#94a3b8",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                Function Details & Call Graph
              </span>
            </div>

            <span
              style={{
                marginLeft: "0.5rem",
                fontSize: "0.7rem",
                padding: "0.15rem 0.45rem",
                borderRadius: "4px",
                fontWeight: 700,
                fontFamily: "ui-monospace, monospace",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              {callCount} call{callCount !== 1 ? "s" : ""}
            </span>
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
          {/* Definitions Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1rem",
              borderRadius: "8px",
              background: "rgba(3, 7, 18, 0.7)",
              border: "1px solid rgba(51, 65, 85, 0.5)",
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
              Definitions ({definitions.length})
            </span>

            {definitions.length === 0 ? (
              <span style={{ fontSize: "0.82rem", color: "#64748b", fontStyle: "italic" }}>
                No definition line mapped in primary files.
              </span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {definitions.map((def, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onJumpToCode(def.file, def.lineStart, def.lineEnd || def.lineStart);
                      onClose();
                    }}
                    style={{
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(51, 65, 85, 0.6)",
                      color: "#38bdf8",
                      fontSize: "0.82rem",
                      fontFamily: "ui-monospace, monospace",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(56, 189, 248, 0.5)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(51, 65, 85, 0.6)";
                    }}
                  >
                    <span>
                      📄 <strong>{def.file}</strong> (lines {def.lineStart}{def.lineEnd ? `–${def.lineEnd}` : ""})
                    </span>
                    {def.isExport && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.1rem 0.35rem",
                          borderRadius: "3px",
                          background: "rgba(52, 211, 153, 0.15)",
                          color: "#34d399",
                          border: "1px solid rgba(52, 211, 153, 0.3)",
                        }}
                      >
                        EXPORTED
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Called In Section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1rem",
              borderRadius: "8px",
              background: "rgba(3, 7, 18, 0.7)",
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
              Called in ({callSites.length})
            </span>

            {callSites.length === 0 ? (
              <span style={{ fontSize: "0.82rem", color: "#64748b", fontStyle: "italic" }}>
                No direct call sites recorded in analyzed files.
              </span>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {callSites.map((call, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onJumpToCode(call.file, call.line, call.line);
                      onClose();
                    }}
                    style={{
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(51, 65, 85, 0.6)",
                      color: "#cbd5e1",
                      fontSize: "0.82rem",
                      fontFamily: "ui-monospace, monospace",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(56, 189, 248, 0.5)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "rgba(51, 65, 85, 0.6)";
                    }}
                  >
                    <span>
                      📞 <strong>{call.file}</strong> (line {call.line})
                    </span>
                    {call.callerFunction && (
                      <span style={{ fontSize: "0.72rem", color: "#38bdf8" }}>
                        inside <code style={{ color: "#f8fafc" }}>{call.callerFunction}()</code>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            ← Back to overview
          </button>

          <button
            onClick={() => {
              if (allFiles.length > 0) {
                onOpenInGraph("detailed", allFiles);
              }
              onClose();
            }}
            disabled={allFiles.length === 0}
            style={{
              padding: "0.55rem 1.25rem",
              borderRadius: "6px",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              background: "rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: allFiles.length > 0 ? "pointer" : "not-allowed",
              fontFamily: "ui-monospace, monospace",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              opacity: allFiles.length > 0 ? 1 : 0.5,
            }}
          >
            🎯 Show in graph →
          </button>
        </div>
      </div>
    </div>
  );
}
