"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import ForceGraph3D from "react-force-graph-3d";
import type { CodeNode, CodeEdge, NodeType } from "@/lib/graph-builder";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface Graph3DProps {
  nodes: CodeNode[];
  edges: CodeEdge[];
  highlightedFiles?: string[];
  onNodeClick?: (nodeId: string, nodeType: NodeType) => void;
}

// ---------------------------------------------------------------------------
// Helper Color Functions
// ---------------------------------------------------------------------------

function getNodeColor(node: CodeNode, isFocused: boolean): string {
  if (isFocused) return "#fbbf24";
  switch (node.type) {
    case "workspace":
      return "#c084fc";
    case "folder":
      return "#64748b";
    case "file":
      return node.isImportant ? "#34d399" : node.isLowValue ? "#475569" : "#38bdf8";
    case "class":
      return "#a855f7";
    case "interface":
      return "#06b6d4";
    case "function":
      return "#10b981";
    case "method":
      return "#eab308";
    case "component":
      return "#f97316";
    case "variable":
    case "constant":
      return "#94a3b8";
    default:
      return "#38bdf8";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Graph3DInner({
  nodes,
  edges,
  highlightedFiles = [],
  onNodeClick,
}: Graph3DProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hoverNode, setHoverNode] = useState<any>(null);

  const highlightedSet = useMemo(() => new Set(highlightedFiles), [highlightedFiles]);

  const graphData = useMemo(() => {
    const validNodeIds = new Set(nodes.map((n) => n.id));

    const formattedNodes = nodes.map((n) => {
      const isFocused = highlightedSet.has(n.id);
      const color = getNodeColor(n, isFocused);

      return {
        id: n.id,
        name: n.label || n.name,
        type: n.type,
        color,
        val: n.type === "workspace" ? 8 : n.type === "class" ? 7 : n.type === "folder" ? 5 : 3,
        isFocused,
      };
    });

    const formattedLinks = edges
      .filter((e) => validNodeIds.has(e.from) && validNodeIds.has(e.to))
      .map((e) => ({
        source: e.from,
        target: e.to,
        type: e.type,
      }));

    return { nodes: formattedNodes, links: formattedLinks };
  }, [nodes, edges, highlightedSet]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeHover = useCallback((node: any) => {
    setHoverNode(node || null);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNodeClick = useCallback(
    (node: any) => {
      if (node && onNodeClick) {
        onNodeClick(node.id, node.type);
      }
    },
    [onNodeClick]
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "550px",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#030712",
        border: "1px solid rgba(56, 189, 248, 0.2)",
      }}
    >
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#030712"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeColor={(node: any) => (hoverNode && hoverNode.id === node.id ? "#38bdf8" : node.color)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeVal={(node: any) => (hoverNode && hoverNode.id === node.id ? node.val * 1.5 : node.val)}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nodeLabel={(node: any) =>
          `<div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(56, 189, 248, 0.4); padding: 4px 8px; border-radius: 4px; color: #f8fafc; font-family: monospace; font-size: 12px;">
            <strong style="color: ${node.color};">${node.type.toUpperCase()}</strong>: ${node.name}
          </div>`
        }
        nodeRelSize={4}
        linkColor={() => "rgba(56, 189, 248, 0.25)"}
        linkWidth={1}
        linkOpacity={0.6}
        linkDirectionalParticles={1}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleColor={() => "#38bdf8"}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
      />

      {hoverNode && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "1rem",
            zIndex: 10,
            padding: "0.5rem 0.85rem",
            borderRadius: "6px",
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            color: "#f8fafc",
            fontSize: "0.82rem",
            fontFamily: "ui-monospace, monospace",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            pointerEvents: "none",
          }}
        >
          <span style={{ color: hoverNode.color, fontWeight: 700 }}>
            {hoverNode.type.toUpperCase()}
          </span>
          <span>{hoverNode.name}</span>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
          padding: "0.4rem 0.7rem",
          borderRadius: "6px",
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#94a3b8",
          fontSize: "0.75rem",
          fontFamily: "ui-monospace, monospace",
          pointerEvents: "none",
        }}
      >
        Left Click: Rotate | Right Click: Pan | Scroll: Zoom
      </div>
    </div>
  );
}
