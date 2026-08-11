"use client";

/**
 * GraphExplanation — brief guide shown above the code graph
 * explaining entity types, relationship edges, and interaction.
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
          🌐 Entity-Level Code Graph Explorer
        </p>
        <span style={{ fontSize: "0.75rem", fontFamily: "ui-monospace, SFMono-Regular, monospace", color: "#38bdf8", padding: "0.15rem 0.5rem", borderRadius: "4px", background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
          AST ENTITY v2
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
          Deterministic AST analysis extracts <strong style={{ color: "#a855f7" }}>Classes</strong>, <strong style={{ color: "#06b6d4" }}>Interfaces</strong>, <strong style={{ color: "#10b981" }}>Functions</strong>, <strong style={{ color: "#eab308" }}>Methods</strong>, and <strong style={{ color: "#f97316" }}>Components</strong> inside source containers.
        </li>
        <li>
          Hover any entity node to inspect its scope, line range, and relationship links. Use lens tabs below to toggle between <strong>High-Level Architecture</strong>, <strong>Detailed Entities</strong>, <strong>Call Graph</strong>, and <strong>Focused Neighborhood</strong>.
        </li>
      </ul>

      {/* Entity & Relationship Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.8rem 1.2rem",
          marginTop: "0.8rem",
          paddingTop: "0.7rem",
          borderTop: "1px solid rgba(51, 65, 85, 0.6)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#38bdf8", display: "inline-block" }} />
          <span style={{ color: "#cbd5e1", fontSize: "0.8rem", fontFamily: "ui-monospace, monospace" }}>📄 File</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 6px #a855f7", display: "inline-block" }} />
          <span style={{ color: "#cbd5e1", fontSize: "0.8rem", fontFamily: "ui-monospace, monospace" }}>🟣 Class</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#06b6d4", display: "inline-block" }} />
          <span style={{ color: "#cbd5e1", fontSize: "0.8rem", fontFamily: "ui-monospace, monospace" }}>🔷 Interface</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981", display: "inline-block" }} />
          <span style={{ color: "#cbd5e1", fontSize: "0.8rem", fontFamily: "ui-monospace, monospace" }}>🔵 Function</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308", display: "inline-block" }} />
          <span style={{ color: "#cbd5e1", fontSize: "0.8rem", fontFamily: "ui-monospace, monospace" }}>⚡ Method</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f97316", display: "inline-block" }} />
          <span style={{ color: "#cbd5e1", fontSize: "0.8rem", fontFamily: "ui-monospace, monospace" }}>🧱 Component</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#c084fc", display: "inline-block" }} />
          <span style={{ color: "#cbd5e1", fontSize: "0.8rem", fontFamily: "ui-monospace, monospace" }}>📦 Workspace</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#64748b", display: "inline-block" }} />
          <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontFamily: "ui-monospace, monospace" }}>📁 Folder</span>
        </span>
      </div>
    </div>
  );
}
