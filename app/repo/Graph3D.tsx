"use client";

import dynamic from "next/dynamic";
import { useState, Component, type ReactNode } from "react";
import type { GraphNode, GraphEdge } from "@/lib/github";

// ---------------------------------------------------------------------------
// Dynamic Import for 3D Canvas Component (SSR disabled)
// ---------------------------------------------------------------------------

const Graph3DInner = dynamic(() => import("./Graph3DInner"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "550px",
        borderRadius: "12px",
        background: "#030712",
        border: "1px solid rgba(56, 189, 248, 0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#38bdf8",
        fontFamily: "ui-monospace, monospace",
        fontSize: "0.9rem",
      }}
    >
      <span>🌌 Initializing 3D WebGL Canvas…</span>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Error Boundary for WebGL / 3D Canvas Fallback
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class Graph3DErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[Graph3D] Failed to render 3D WebGL Canvas:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Props & Outer Component
// ---------------------------------------------------------------------------

export interface Graph3DWrapperProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedFiles?: string[];
  onNodeClick?: (nodeId: string, nodeType: "file" | "folder" | "workspace") => void;
  onFallbackTo2D?: () => void;
}

export default function Graph3D({
  nodes,
  edges,
  highlightedFiles = [],
  onNodeClick,
  onFallbackTo2D,
}: Graph3DWrapperProps) {
  const isLargeGraph = nodes.length > 200;

  const fallbackUI = (
    <div
      style={{
        width: "100%",
        height: "550px",
        borderRadius: "12px",
        background: "rgba(15, 23, 42, 0.9)",
        border: "1px dashed rgba(239, 68, 68, 0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
        color: "#f8fafc",
      }}
    >
      <span style={{ fontSize: "2rem" }}>⚠️</span>
      <div>
        <h4 style={{ margin: 0, fontSize: "1rem", color: "#f87171" }}>
          3D WebGL Canvas Unavailable
        </h4>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "#94a3b8", maxWidth: "26rem" }}>
          Your browser or graphics device does not support WebGL 3D rendering.
        </p>
      </div>

      {onFallbackTo2D && (
        <button
          onClick={onFallbackTo2D}
          style={{
            padding: "0.45rem 0.95rem",
            borderRadius: "6px",
            background: "rgba(56, 189, 248, 0.15)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            color: "#38bdf8",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          Switch to 2D Graph Mode
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {/* Large graph warning notice */}
      {isLargeGraph && (
        <div
          style={{
            padding: "0.4rem 0.85rem",
            borderRadius: "6px",
            background: "rgba(251, 191, 36, 0.1)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            color: "#fbbf24",
            fontSize: "0.78rem",
            fontFamily: "ui-monospace, monospace",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>⚡</span>
          <span>
            Large graph detected ({nodes.length} nodes). 3D physics rendering may vary based on GPU performance.
          </span>
        </div>
      )}

      <Graph3DErrorBoundary fallback={fallbackUI}>
        <Graph3DInner
          nodes={nodes}
          edges={edges}
          highlightedFiles={highlightedFiles}
          onNodeClick={onNodeClick}
        />
      </Graph3DErrorBoundary>
    </div>
  );
}
