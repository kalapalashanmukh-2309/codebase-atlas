"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RepoGraphProps {
  nodes: { id: string; label: string; type: "file" | "folder" | "workspace" }[];
  edges: { from: string; to: string }[];
  focusFile?: string | null;
  highlightedFiles?: string[];
}

// ---------------------------------------------------------------------------
// Types for react-force-graph (ForceGraph2D)
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string;
  label: string;
  type: "file" | "folder" | "workspace";
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraph2DComponent = React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOLDER_COLOR = "#6366f1"; // indigo-500
const WORKSPACE_COLOR = "#a855f7"; // purple-500
const FILE_COLOR = "#22d3ee"; // cyan-400
const FOCUS_COLOR = "#fbbf24"; // amber-400

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RepoGraph renders an interactive 2-D force-directed graph of the repo
 * structure using react-force-graph's ForceGraph2D.
 *
 * - Workspace nodes are purple circles with package labels.
 * - Folder nodes are indigo circles.
 * - File nodes are cyan circles.
 * - Focused & highlighted files glow in gold with bold labels.
 */
export default function RepoGraph({
  nodes,
  edges,
  focusFile,
  highlightedFiles,
}: RepoGraphProps) {
  // --- Dynamic import (canvas component can't render on the server) ---
  const [FG2D, setFG2D] = useState<ForceGraph2DComponent | null>(null);

  useEffect(() => {
    import("react-force-graph-2d").then((mod) => {
      setFG2D(() => mod.default);
    });
  }, []);

  // --- Build the data structure ForceGraph2D expects ---
  const graphData: GraphData = {
    nodes: nodes.map((n) => ({ ...n })),
    links: edges.map((e) => ({ source: e.from, target: e.to })),
  };

  // --- Resize handling ---
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 500,
        });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // --- Interaction callbacks ---
  const handleNodeClick = useCallback((node: GraphNode) => {
    console.log("Node clicked:", node);
  }, []);

  // --- Focus & Highlight check helper ---
  const isFocusedNode = useCallback(
    (node: GraphNode) => {
      const id = node.id.toLowerCase();

      if (focusFile) {
        const f = focusFile.toLowerCase();
        if (id === f || id.endsWith(f) || f.endsWith(id)) return true;
      }

      if (highlightedFiles && highlightedFiles.length > 0) {
        return highlightedFiles.some((hf) => {
          const lowerHf = hf.toLowerCase();
          return id === lowerHf || id.endsWith(lowerHf) || lowerHf.endsWith(id);
        });
      }

      return false;
    },
    [focusFile, highlightedFiles]
  );

  // --- Render ---
  if (!FG2D) {
    return <p style={{ color: "#888" }}>Loading graph…</p>;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        border: "1px solid #334155",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#0f172a", // slate-900 dark background
      }}
    >
      <FG2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        /* ---- Custom Node Rendering ---- */
        nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.label;
          const focused = isFocusedNode(node);
          const isWorkspace = node.type === "workspace";
          const fontSize = (focused ? 13 : isWorkspace ? 12 : 11) / globalScale;
          const radius = focused ? 9 : isWorkspace ? 7 : node.type === "folder" ? 6 : 4;
          const color = focused
            ? FOCUS_COLOR
            : isWorkspace
            ? WORKSPACE_COLOR
            : node.type === "folder"
            ? FOLDER_COLOR
            : FILE_COLOR;

          if (node.x === undefined || node.y === undefined) return;

          // Outer halo for focused node
          if (focused) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(251, 191, 36, 0.35)";
            ctx.fill();
          }

          // Node circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = focused ? "#ffffff" : "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = (focused ? 2 : 0.5) / globalScale;
          ctx.stroke();

          // Label rendering (focused nodes, workspaces when zoomed in slightly, or general nodes when zoomed in)
          if (focused || (isWorkspace && globalScale > 1.3) || globalScale > 1.8) {
            ctx.font = `${focused || isWorkspace ? "bold " : ""}${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = focused ? "#fbbf24" : isWorkspace ? "#c084fc" : "#f8fafc";
            ctx.fillText(label, node.x, node.y + radius + fontSize + 2);
          }
        }}
        nodeLabel={(node: GraphNode) => node.label}
        nodeRelSize={6}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={100}
        cooldownTicks={120}
        /* ---- Link appearance ---- */
        linkColor={() => "rgba(148,163,184,0.35)"}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        /* ---- Interaction ---- */
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}
