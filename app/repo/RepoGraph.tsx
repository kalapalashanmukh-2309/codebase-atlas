"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RepoGraphProps {
  nodes: {
    id: string;
    label: string;
    type: "file" | "folder" | "workspace";
    isImportant?: boolean;
    isLowValue?: boolean;
  }[];
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
  isImportant?: boolean;
  isLowValue?: boolean;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | { id: string };
  target: string | { id: string };
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraph2DComponent = React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Color Palette (Sci-Fi Dark Theme Visual System)
// ---------------------------------------------------------------------------

const COLOR_DEFAULT_FILE = "#38bdf8"; // Primary cyan-blue for standard source files
const COLOR_IMPORTANT_FILE = "#34d399"; // Bright emerald teal accent for entry points (index, main, cli)
const COLOR_LOW_VALUE_FILE = "#475569"; // Muted slate gray for utility / low-value files
const COLOR_FOLDER = "#6366f1"; // Muted indigo for folder containers
const COLOR_WORKSPACE = "#c084fc"; // Soft neon purple for monorepo workspace packages
const COLOR_FOCUS = "#fbbf24"; // Vibrant glowing gold for Q&A focused files

// Helper: Calculate node radius based on visual hierarchy
function getNodeRadius(node: GraphNode, focused: boolean): number {
  if (focused) return 9;
  if (node.type === "workspace") return 8;
  if (node.isImportant) return 7;
  if (node.type === "folder") return 6;
  if (node.isLowValue) return 4;
  return 5.5;
}

// Helper: Calculate node color based on type and importance
function getNodeColor(node: GraphNode, focused: boolean): string {
  if (focused) return COLOR_FOCUS;
  if (node.type === "workspace") return COLOR_WORKSPACE;
  if (node.type === "folder") return COLOR_FOLDER;
  if (node.isImportant) return COLOR_IMPORTANT_FILE;
  if (node.isLowValue) return COLOR_LOW_VALUE_FILE;
  return COLOR_DEFAULT_FILE;
}

// Helper: Safely extract string ID from link endpoint
function getLinkId(endpoint: string | { id: string }): string {
  return typeof endpoint === "object" && endpoint !== null ? endpoint.id : endpoint;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RepoGraph renders an interactive 2-D force-directed graph of the repo
 * structure using react-force-graph's ForceGraph2D.
 *
 * Sci-Fi Dark UI & Tooltips:
 * - HTML-styled glassmorphism floating tooltips with monospace paths & metadata badges.
 * - Deep space dark container background with subtle cyan ambient glow.
 * - Smooth 300ms fade-in, hover scaling, and camera pan transitions.
 */
export default function RepoGraph({
  nodes,
  edges,
  focusFile,
  highlightedFiles,
}: RepoGraphProps) {
  // --- Dynamic import (canvas component can't render on the server) ---
  const [FG2D, setFG2D] = useState<ForceGraph2DComponent | null>(null);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [mountProgress, setMountProgress] = useState(0.1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  useEffect(() => {
    import("react-force-graph-2d").then((mod) => {
      setFG2D(() => mod.default);
    });
  }, []);

  // --- Smooth mount fade-in animation (300ms) ---
  useEffect(() => {
    let start: number | null = null;
    let frameId: number;

    function step(timestamp: number) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, 0.1 + (elapsed / 300) * 0.9);
      setMountProgress(progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    }

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [nodes]);

  // --- Build the data structure ForceGraph2D expects ---
  const graphData: GraphData = useMemo(() => {
    return {
      nodes: nodes.map((n) => ({ ...n })),
      links: edges.map((e) => ({ source: e.from, target: e.to })),
    };
  }, [nodes, edges]);

  // --- Hover Neighbors Map ---
  const hoverNeighborSet = useMemo(() => {
    const set = new Set<string>();
    if (!hoverNode) return set;

    set.add(hoverNode.id);
    for (const link of graphData.links) {
      const sId = getLinkId(link.source);
      const tId = getLinkId(link.target);

      if (sId === hoverNode.id) set.add(tId);
      if (tId === hoverNode.id) set.add(sId);
    }
    return set;
  }, [hoverNode, graphData]);

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

  // --- D3 Force Layout Tuning ---
  useEffect(() => {
    if (fgRef.current) {
      const chargeForce = fgRef.current.d3Force("charge");
      if (chargeForce) {
        chargeForce.strength(-350).distanceMax(650);
      }

      const linkForce = fgRef.current.d3Force("link");
      if (linkForce) {
        linkForce.distance(75).strength(0.4);
      }

      const centerForce = fgRef.current.d3Force("center");
      if (centerForce) {
        centerForce.x(dimensions.width / 2).y(dimensions.height / 2);
      }
    }
  }, [FG2D, dimensions.width, dimensions.height]);

  // --- Smooth Camera Transition to Focused Node ---
  useEffect(() => {
    if (!fgRef.current || !focusFile) return;

    const lowerFocus = focusFile.toLowerCase();
    const targetNode = graphData.nodes.find((n) => {
      const lowerId = n.id.toLowerCase();
      return lowerId === lowerFocus || lowerId.endsWith(lowerFocus) || lowerFocus.endsWith(lowerId);
    });

    if (targetNode && targetNode.x !== undefined && targetNode.y !== undefined) {
      fgRef.current.centerAt(targetNode.x, targetNode.y, 350);
      fgRef.current.zoom(2.2, 350);
    }
  }, [focusFile, graphData]);

  // --- Interaction callbacks ---
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 300);
    }
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoverNode(node);
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
        border: "1px solid #1e293b",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#030712", // Deep space navy dark theme
        boxShadow: "0 0 25px rgba(56, 189, 248, 0.08) inset, 0 10px 30px rgba(0, 0, 0, 0.6)",
      }}
    >
      <FG2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        /* ---- Custom Node Rendering with Subtle Animations & Glow ---- */
        nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.label;
          const focused = isFocusedNode(node);
          const isWorkspace = node.type === "workspace";
          const isHovered = hoverNode && hoverNode.id === node.id;
          const baseRadius = getNodeRadius(node, focused);
          
          const radius = baseRadius * (isHovered ? 1.25 : 1) * mountProgress;
          const color = getNodeColor(node, focused);
          const fontSize = (focused ? 13 : isWorkspace ? 12 : 11) / globalScale;

          if (node.x === undefined || node.y === undefined) return;

          // Fade out nodes unrelated to current hover selection
          const isNeighbor = !hoverNode || hoverNeighborSet.has(node.id);
          ctx.save();
          ctx.globalAlpha = (isNeighbor ? 1.0 : 0.2) * mountProgress;

          // Outer halo glow for focused node
          if (focused) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(251, 191, 36, 0.35)";
            ctx.fill();
          }

          // Outer cyan aura for hovered node
          if (isHovered) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
            ctx.fill();
          }

          // Node circle with canvas radial shadow blur glow
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
          ctx.shadowBlur = (focused ? 12 : isHovered ? 10 : node.isImportant ? 7 : 4) / globalScale;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.fill();

          // Reset shadowBlur for stroke and label text
          ctx.shadowBlur = 0;
          ctx.strokeStyle = focused ? "#ffffff" : "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = (focused ? 2 : 0.6) / globalScale;
          ctx.stroke();

          // Label rendering (focused nodes, hovered nodes, workspaces when zoomed in slightly, or general nodes when zoomed in)
          if (focused || isHovered || (isWorkspace && globalScale > 1.3) || globalScale > 1.8) {
            ctx.font = `${focused || node.isImportant || isWorkspace ? "bold " : ""}${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = focused
              ? "#fbbf24"
              : isWorkspace
              ? "#e9d5ff"
              : node.isImportant
              ? "#6ee7b7"
              : "#f8fafc";
            ctx.fillText(label, node.x, node.y + radius + fontSize + 2);
          }

          ctx.restore();
        }}
        /* ---- Custom Futuristic Monospace HTML Floating Tooltip ---- */
        nodeLabel={(node: GraphNode) => {
          const typeBadge =
            node.type === "workspace"
              ? "📦 WORKSPACE"
              : node.type === "folder"
              ? "📁 FOLDER CONTAINER"
              : node.isImportant
              ? "⭐ KEY ENTRY FILE"
              : node.isLowValue
              ? "📄 UTILITY MODULE"
              : "📄 SOURCE MODULE";

          const badgeColor =
            node.type === "workspace"
              ? "#c084fc"
              : node.type === "folder"
              ? "#818cf8"
              : node.isImportant
              ? "#34d399"
              : node.isLowValue
              ? "#94a3b8"
              : "#38bdf8";

          const cleanPath = node.id.replace(/^workspace:/, "");
          const ext = cleanPath.includes(".") ? cleanPath.split(".").pop() || "" : "";

          return `
            <div style="
              padding: 0.65rem 0.9rem;
              background: rgba(11, 15, 25, 0.94);
              backdrop-filter: blur(12px);
              border: 1px solid rgba(56, 189, 248, 0.35);
              border-radius: 8px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.15);
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              color: #f8fafc;
              font-size: 0.8rem;
              line-height: 1.5;
              max-width: 380px;
              pointer-events: none;
            ">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.4rem; border-bottom: 1px solid rgba(51, 65, 85, 0.6); padding-bottom: 0.35rem;">
                <span style="font-size: 0.68rem; font-weight: 700; color: ${badgeColor}; letter-spacing: 0.06em;">
                  ${typeBadge}
                </span>
                ${ext ? `<span style="font-size: 0.65rem; color: #64748b; background: rgba(51, 65, 85, 0.5); padding: 0.1rem 0.35rem; border-radius: 3px; text-transform: uppercase;">.${ext}</span>` : ""}
              </div>
              <div style="font-weight: 600; color: #f1f5f9; word-break: break-all; font-size: 0.85rem;">
                ${cleanPath}
              </div>
              <div style="margin-top: 0.4rem; font-size: 0.72rem; color: #94a3b8; display: flex; gap: 0.8rem;">
                <span>Type: <strong style="color: #cbd5e1;">${node.type}</strong></span>
                ${node.isImportant ? '<span style="color: #34d399; font-weight: 600;">⭐ Primary Anchor</span>' : ""}
              </div>
            </div>
          `;
        }}
        nodeRelSize={6}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.35}
        warmupTicks={100}
        cooldownTicks={150}
        /* ---- Dynamic Link Appearance ---- */
        linkColor={(link: GraphLink) => {
          if (!hoverNode) return "rgba(56, 189, 248, 0.16)"; // Thin, subtle sci-fi cyan line by default

          const sId = getLinkId(link.source);
          const tId = getLinkId(link.target);
          const isConnected = sId === hoverNode.id || tId === hoverNode.id;

          return isConnected
            ? "rgba(56, 189, 248, 0.95)" // Glowing cyan highlight for connected edges!
            : "rgba(148, 163, 184, 0.04)"; // Faded out for unrelated edges
        }}
        linkWidth={(link: GraphLink) => {
          if (!hoverNode) return 1;
          const sId = getLinkId(link.source);
          const tId = getLinkId(link.target);
          return sId === hoverNode.id || tId === hoverNode.id ? 2.5 : 0.5;
        }}
        linkDirectionalArrowLength={(link: GraphLink) => {
          if (!hoverNode) return 3.5;
          const sId = getLinkId(link.source);
          const tId = getLinkId(link.target);
          return sId === hoverNode.id || tId === hoverNode.id ? 6 : 1.5;
        }}
        linkDirectionalArrowRelPos={1}
        /* ---- Particle Light Beams on Hover ---- */
        linkDirectionalParticles={(link: GraphLink) => {
          if (!hoverNode) return 0;
          const sId = getLinkId(link.source);
          const tId = getLinkId(link.target);
          return sId === hoverNode.id || tId === hoverNode.id ? 3 : 0;
        }}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleColor={() => "#38bdf8"}
        /* ---- Interaction ---- */
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
      />
    </div>
  );
}
