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
        borderRadius: "8px",
        background: "#1e293b",
        border: "1px solid #334155",
        fontSize: "0.9rem",
        color: "#94a3b8",
        lineHeight: 1.6,
      }}
    >
      <p style={{ margin: 0, marginBottom: "0.5rem", fontWeight: 600, color: "#cbd5e1" }}>
        How to read this graph
      </p>
      <ul
        style={{
          margin: 0,
          paddingLeft: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <li>
          Standard source files are rendered in <strong style={{ color: "#7dd3fc" }}>Cyan Blue</strong>. Key entry files (<code style={{ color: "#6ee7b7" }}>index</code>, <code style={{ color: "#6ee7b7" }}>main</code>, <code style={{ color: "#6ee7b7" }}>cli</code>, <code style={{ color: "#6ee7b7" }}>app</code>) are highlighted in <strong style={{ color: "#6ee7b7" }}>Teal Green</strong>.
        </li>
        <li>
          Nodes display short filenames on screen. <strong style={{ color: "#cbd5e1" }}>Hover any node</strong> to see its full path in a tooltip.
        </li>
        <li>
          <strong style={{ color: "#cbd5e1" }}>Drag</strong> nodes to rearrange, <strong style={{ color: "#cbd5e1" }}>scroll</strong> to zoom, and <strong style={{ color: "#cbd5e1" }}>click Q&amp;A file badges</strong> to focus nodes in gold.
        </li>
      </ul>

      {/* Color legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem 1.25rem",
          marginTop: "0.75rem",
          paddingTop: "0.6rem",
          borderTop: "1px solid #334155",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#38bdf8",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Source File</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#34d399",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Key Entry File</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "#64748b",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Utility / Muted</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#a855f7",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Workspace</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#6366f1",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Folder</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#fbbf24",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>Focused File</span>
        </span>
      </div>
    </div>
  );
}
