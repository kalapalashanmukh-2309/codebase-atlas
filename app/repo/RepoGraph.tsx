"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RepoGraphProps {
  nodes: { id: string; label: string; type: "file" | "folder" }[];
  edges: { from: string; to: string }[];
}

// ---------------------------------------------------------------------------
// Types for react-force-graph (ForceGraph2D)
//
// react-force-graph doesn't ship its own TS types. We declare the minimal
// shapes we need rather than pulling in DefinitelyTyped.
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string;
  label: string;
  type: "file" | "folder";
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

// We dynamically import ForceGraph2D below to avoid SSR issues (it uses
// canvas / requestAnimationFrame). We type the component loosely here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraph2DComponent = React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOLDER_COLOR = "#6366f1"; // indigo-500
const FILE_COLOR = "#22d3ee"; // cyan-400

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RepoGraph renders an interactive 2-D force-directed graph of the repo
 * structure using react-force-graph's ForceGraph2D.
 *
 * - Folder nodes are indigo circles.
 * - File nodes are cyan circles.
 * - Hovering a node shows its label.
 * - Clicking a node logs its info to the console.
 */
export default function RepoGraph({ nodes, edges }: RepoGraphProps) {
  // --- Dynamic import (canvas component can't render on the server) ---
  const [FG2D, setFG2D] = useState<ForceGraph2DComponent | null>(null);

  useEffect(() => {
    // Import the 2D-only package directly to avoid pulling in AFRAME/three.js
    // dependencies that the umbrella `react-force-graph` package includes.
    import("react-force-graph-2d").then((mod) => {
      setFG2D(() => mod.default);
    });
  }, []);

  // --- Build the data structure ForceGraph2D expects ---
  const graphData: GraphData = {
    nodes: nodes.map((n) => ({ ...n })),
    links: edges.map((e) => ({ source: e.from, target: e.to })),
  };

  // --- Resize handling: fill the container width ---
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

  // --- Render ---
  if (!FG2D) {
    return <p style={{ color: "#888" }}>Loading graph…</p>;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#0f172a", // slate-900 dark background
      }}
    >
      <FG2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        /* ---- Node appearance ---- */
        nodeLabel={(node: GraphNode) => node.label}
        nodeColor={(node: GraphNode) =>
          node.type === "folder" ? FOLDER_COLOR : FILE_COLOR
        }
        nodeRelSize={5}
        /* ---- Link appearance ---- */
        linkColor={() => "rgba(148,163,184,0.35)"} // subtle slate lines
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        /* ---- Interaction ---- */
        onNodeClick={handleNodeClick}
        /* ---- Performance: stop simulation after settling ---- */
        cooldownTicks={80}
      />
    </div>
  );
}
