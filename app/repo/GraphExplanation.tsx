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
          Each node is a folder or source file (TS/JS) found in the repository.{" "}
          <span style={{ color: "#6366f1" }}>■</span>{" "}
          <strong style={{ color: "#c7d2fe" }}>Purple</strong> = folder,{" "}
          <span style={{ color: "#22d3ee" }}>■</span>{" "}
          <strong style={{ color: "#a5f3fc" }}>Cyan</strong> = file.
        </li>
        <li>Lines connect folders to the files they contain.</li>
        <li>
          <strong style={{ color: "#cbd5e1" }}>Hover</strong> to see labels,{" "}
          <strong style={{ color: "#cbd5e1" }}>drag</strong> nodes to rearrange,{" "}
          <strong style={{ color: "#cbd5e1" }}>scroll</strong> to zoom.
        </li>
      </ul>

      {/* Compact color legend */}
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
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
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#22d3ee",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#cbd5e1", fontSize: "0.85rem" }}>File</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span
            style={{
              width: 10,
              height: 10,
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
