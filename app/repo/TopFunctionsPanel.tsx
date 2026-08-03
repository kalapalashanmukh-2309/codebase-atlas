"use client";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FunctionCountItem {
  name: string;
  count: number;
  files: string[];
}

interface TopFunctionsPanelProps {
  functionCounts?: {
    allFunctions: FunctionCountItem[];
    hooks?: FunctionCountItem[];
  };
  onSelectFunction: (functionName: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TopFunctionsPanel({
  functionCounts,
  onSelectFunction,
}: TopFunctionsPanelProps) {
  if (!functionCounts) return null;

  const topFunctions = (functionCounts.allFunctions || []).slice(0, 10);
  const topHooks = (functionCounts.hooks || []).slice(0, 10);

  if (topFunctions.length === 0 && topHooks.length === 0) return null;

  return (
    <div
      style={{
        padding: "1.25rem",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(56, 189, 248, 0.25)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.2rem" }}>⚡</span>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: "#f8fafc",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            Most used functions
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>
          Based on call frequency across the codebase.
        </p>
      </div>

      {/* Top Functions List */}
      {topFunctions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
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
            Functions ({topFunctions.length})
          </span>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))",
              gap: "0.5rem",
            }}
          >
            {topFunctions.map((item) => (
              <button
                key={item.name}
                onClick={() => onSelectFunction(item.name)}
                style={{
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  background: "rgba(3, 7, 18, 0.75)",
                  border: "1px solid rgba(51, 65, 85, 0.6)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(56, 189, 248, 0.5)";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(15, 23, 42, 0.95)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(51, 65, 85, 0.6)";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(3, 7, 18, 0.75)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#38bdf8",
                      fontFamily: "ui-monospace, monospace",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}()
                  </span>

                  <span
                    style={{
                      fontSize: "0.68rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "rgba(56, 189, 248, 0.12)",
                      color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                      fontWeight: 700,
                      fontFamily: "ui-monospace, monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.count} call{item.count !== 1 ? "s" : ""}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#64748b",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  in {item.files.length} file{item.files.length !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Top React Hooks List */}
      {topHooks.length > 0 && (
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
            Most used hooks ({topHooks.length})
          </span>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))",
              gap: "0.5rem",
            }}
          >
            {topHooks.map((item) => (
              <button
                key={item.name}
                onClick={() => onSelectFunction(item.name)}
                style={{
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  background: "rgba(3, 7, 18, 0.75)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(52, 211, 153, 0.6)";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(15, 23, 42, 0.95)";
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "rgba(52, 211, 153, 0.3)";
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(3, 7, 18, 0.75)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#34d399",
                      fontFamily: "ui-monospace, monospace",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.name}()
                  </span>

                  <span
                    style={{
                      fontSize: "0.68rem",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: "rgba(52, 211, 153, 0.15)",
                      color: "#34d399",
                      border: "1px solid rgba(52, 211, 153, 0.3)",
                      fontWeight: 700,
                      fontFamily: "ui-monospace, monospace",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.count} call{item.count !== 1 ? "s" : ""}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "#64748b",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  in {item.files.length} file{item.files.length !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
