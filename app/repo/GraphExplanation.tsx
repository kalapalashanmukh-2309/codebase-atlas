"use client";

/**
 * GraphExplanation — brief guide shown above the dependency graph
 * explaining what the visualization represents and how to interact with it.
 */

export default function GraphExplanation() {
  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "10px",
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(56, 189, 248, 0.2)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.05)",
        fontSize: "0.88rem",
        color: "#94a3b8",
        lineHeight: 1.6,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <p style={{ margin: 0, fontWeight: 700, color: "#e2e8f0", fontSize: "0.95rem", letterSpacing: "0.02em" }}>
          🌐 Dependency Graph Explorer
        </p>
        <span style={{ fontSize: "0.75rem", fontFamily: "ui-monospace, SFMono-Regular, monospace", color: "#38bdf8", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
          INTERACTIVE 2D
        </span>
      </div>

      <ul
        style={{
          margin: 0,
          paddingLeft: "1.2rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.3rem",
        }}
      >
        <li>
          Standard source files are rendered in <strong style={{ color: "#38bdf8" }}>Cyan Blue</strong>. Key entry files (<code style={{ color: "#34d399", fontFamily: "ui-monospace, monospace" }}>index</code>, <code style={{ color: "#34d399", fontFamily: "ui-monospace, monospace" }}>main</code>, <code style={{ color: "#34d399", fontFamily: "ui-monospace, monospace" }}>cli</code>, <code style={{ color: "#34d399", fontFamily: "ui-monospace, monospace" }}>app</code>) glow in <strong style={{ color: "#34d399" }}>Teal Green</strong>.
        </li>
        <li>
          Nodes display short filenames on canvas. <strong style={{ color: "#f1f5f9" }}>Hover any node</strong> to see its full path and details in a futuristic floating tooltip.
        </li>
        <li>
          <strong style={{ color: "#f1f5f9" }}>Drag</strong> nodes to rearrange topology, <strong style={{ color: "#f1f5f9" }}>scroll</strong> to zoom, and <strong style={{ color: "#f1f5f9" }}>click Q&amp;A file badges</strong> to trigger smooth camera focus transitions.
        </li>
      </ul>

      {/* Futuristic Color Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem 1.3rem",
          marginTop: "0.8rem",
          paddingTop: "0.7rem",
          borderTop: "1px solid rgba(51, 65, 85, 0.6)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#38bdf8",
              boxShadow: "0 0 8px #38bdf8",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.82rem", fontFamily: "ui-monospace, monospace" }}>Source File</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#34d399",
              boxShadow: "0 0 8px #34d399",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.82rem", fontFamily: "ui-monospace, monospace" }}>Key Entry File</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#475569",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#94a3b8", fontSize: "0.82rem", fontFamily: "ui-monospace, monospace" }}>Utility / Muted</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#c084fc",
              boxShadow: "0 0 8px #c084fc",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.82rem", fontFamily: "ui-monospace, monospace" }}>Workspace</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#6366f1",
              boxShadow: "0 0 8px #6366f1",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.82rem", fontFamily: "ui-monospace, monospace" }}>Folder</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#fbbf24",
              boxShadow: "0 0 10px #fbbf24",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#fbbf24", fontSize: "0.82rem", fontFamily: "ui-monospace, monospace", fontWeight: 600 }}>Focused File</span>
        </span>
      </div>
    </div>
  );
}
