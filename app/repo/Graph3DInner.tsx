"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import ForceGraph3D from "react-force-graph-3d";
import type { GraphNode, GraphEdge } from "@/lib/github";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface Graph3DProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedFiles?: string[];
  onNodeClick?: (nodeId: string, nodeType: "file" | "folder" | "workspace") => void;
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
  const fgRef = useRef<any>(null);
  const [hoverNode, setHoverNode] = useState<any>(null);

  const highlightedSet = useMemo(() => new Set(highlightedFiles), [highlightedFiles]);

  // Convert nodes & edges to 3d-force-graph format
  const graphData = useMemo(() => {
    const validNodeIds = new Set(nodes.map((n) => n.id));

    const formattedNodes = nodes.map((n) => {
      const isFocused = highlightedSet.has(n.id);
      let color = "#94a3b8"; // default file color

      if (isFocused) {
        color = "#38bdf8"; // bright cyan highlight
      } else if (n.type === "workspace") {
        color = "#a855f7"; // purple workspace
      } else if (n.type === "folder") {
        color = "#818cf8"; // indigo folder
      } else if (n.isImportant) {
        color = "#fbbf24"; // amber important file
      }

      return {
        id: n.id,
        name: n.label,
        type: n.type,
        color,
        val: n.type === "workspace" ? 8 : n.type === "folder" ? 5 : 2.5,
        isFocused,
      };
    });

    const formattedLinks = edges
      .filter((e) => validNodeIds.has(e.from) && validNodeIds.has(e.to))
      .map((e) => ({
        source: e.from,
        target: e.to,
      }));

    return { nodes: formattedNodes, links: formattedLinks };
  }, [nodes, edges, highlightedSet]);

  const handleNodeHover = useCallback((node: any) => {
    setHoverNode(node || null);
  }, []);

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
      {/* 3D Force Graph */}
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#030712"
        nodeColor={(node: any) =>
          hoverNode && hoverNode.id === node.id ? "#38bdf8" : node.color
        }
        nodeVal={(node: any) => (hoverNode && hoverNode.id === node.id ? node.val * 1.5 : node.val)}
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

      {/* Hover Info Overlay */}
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

      {/* Control Hints */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
          padding: "0.4rem 0.7rem",
          borderRadius: "6px",
          background: "rgba(15, 23, 42, 0.75)",
          border: "1px solid rgba(51, 65, 85, 0.5)",
          color: "#94a3b8",
          fontSize: "0.75rem",
          fontFamily: "ui-monospace, monospace",
          pointerEvents: "none",
        }}
      >
        Left-drag to rotate • Scroll to zoom • Right-drag to pan
      </div>
    </div>
  );
}
