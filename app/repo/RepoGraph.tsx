"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { type CodeNode, type CodeEdge, type GraphMode, type NodeType, type RelationshipType } from "@/lib/graph-builder";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RepoGraphProps {
  nodes: CodeNode[];
  edges: CodeEdge[];
  focusFile?: string | null;
  highlightedFiles?: string[];
  activeMode?: GraphMode;
  onModeChange?: (mode: GraphMode) => void;
  onNodeClick?: (nodeId: string, nodeType: NodeType) => void;
}

// ---------------------------------------------------------------------------
// ForceGraph2D Types
// ---------------------------------------------------------------------------

interface GraphLink {
  source: string | { id: string };
  target: string | { id: string };
  type?: RelationshipType;
  label?: string;
}

interface GraphData {
  nodes: CodeNode[];
  links: GraphLink[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraph2DComponent = React.ComponentType<any>;

// ---------------------------------------------------------------------------
// Styling Helpers
// ---------------------------------------------------------------------------

function getNodeRadius(node: CodeNode, focused: boolean): number {
  if (focused) return 9;
  switch (node.type) {
    case "workspace":
      return 8.5;
    case "class":
      return 7.5;
    case "component":
      return 7;
    case "folder":
      return 6.5;
    case "function":
    case "interface":
      return 6;
    case "method":
      return 5;
    case "variable":
    case "constant":
      return 4;
    case "file":
    default:
      return node.isImportant ? 7 : node.isLowValue ? 4 : 5.5;
  }
}

function getNodeColor(node: CodeNode, focused: boolean): string {
  if (focused) return "#fbbf24";
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

function getLinkId(endpoint: string | { id: string }): string {
  return typeof endpoint === "object" && endpoint !== null ? endpoint.id : endpoint;
}

function getLinkColor(link: GraphLink, hoverNode: CodeNode | null): string {
  const type = link.type || "contains";

  if (hoverNode) {
    const sId = getLinkId(link.source);
    const tId = getLinkId(link.target);
    const isConnected = sId === hoverNode.id || tId === hoverNode.id;
    if (!isConnected) return "rgba(148, 163, 184, 0.04)";
  }

  switch (type) {
    case "calls":
      return "#10b981";
    case "extends":
    case "implements":
      return "#a855f7";
    case "creates":
      return "#f59e0b";
    case "returns":
      return "#3b82f6";
    case "imports":
    case "exports":
      return "#0284c7";
    case "contains":
    default:
      return "rgba(148, 163, 184, 0.25)";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RepoGraph({
  nodes,
  edges,
  focusFile,
  highlightedFiles = [],
  activeMode = "high-level",
  onModeChange,
  onNodeClick,
}: RepoGraphProps) {
  const [FG2D, setFG2D] = useState<ForceGraph2DComponent | null>(null);
  const [hoverNode, setHoverNode] = useState<CodeNode | null>(null);
  const [mountProgress, setMountProgress] = useState(0.1);
  const [filterType, setFilterType] = useState<string>("all");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  useEffect(() => {
    import("react-force-graph-2d").then((mod) => {
      setFG2D(() => mod.default);
    });
  }, []);

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

  // Filter nodes if user selects specific entity filter
  const filteredNodes = useMemo(() => {
    if (filterType === "all") return nodes;
    return nodes.filter((n) => n.type === filterType);
  }, [nodes, filterType]);

  const graphData: GraphData = useMemo(() => {
    const validIds = new Set(filteredNodes.map((n) => n.id));
    const links: GraphLink[] = edges
      .filter((e) => validIds.has(e.from) && validIds.has(e.to))
      .map((e) => ({
        source: e.from,
        target: e.to,
        type: e.type,
        label: e.label,
      }));

    return {
      nodes: filteredNodes.map((n) => ({ ...n })),
      links,
    };
  }, [filteredNodes, edges]);

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

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 550 });

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 550,
        });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      const chargeForce = fgRef.current.d3Force("charge");
      if (chargeForce) {
        chargeForce.strength(-320).distanceMax(650);
      }

      const linkForce = fgRef.current.d3Force("link");
      if (linkForce) {
        linkForce.distance(70).strength(0.4);
      }
    }
  }, [FG2D, dimensions.width, dimensions.height]);

  useEffect(() => {
    if (!fgRef.current || !focusFile) return;
    const lowerFocus = focusFile.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targetNode = graphData.nodes.find((n: any) => {
      const lowerId = n.id.toLowerCase();
      return lowerId === lowerFocus || lowerId.endsWith(lowerFocus) || lowerFocus.endsWith(lowerId);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (targetNode && (targetNode as any).x !== undefined && (targetNode as any).y !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fgRef.current.centerAt((targetNode as any).x, (targetNode as any).y, 350);
      fgRef.current.zoom(2.2, 350);
    }
  }, [focusFile, graphData]);

  const handleNodeClick = useCallback(
    (node: CodeNode) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (fgRef.current && (node as any).x !== undefined && (node as any).y !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fgRef.current.centerAt((node as any).x, (node as any).y, 300);
      }
      if (onNodeClick) {
        onNodeClick(node.id, node.type);
      }
    },
    [onNodeClick]
  );

  const handleNodeHover = useCallback((node: CodeNode | null) => {
    setHoverNode(node);
  }, []);

  const isFocusedNode = useCallback(
    (node: CodeNode) => {
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

  if (!FG2D) {
    return <p style={{ color: "#888", padding: "1rem" }}>Loading entity graph visualizer…</p>;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        border: "1px solid #1e293b",
        borderRadius: "10px",
        overflow: "hidden",
        background: "#030712",
        boxShadow: "0 0 25px rgba(56, 189, 248, 0.08) inset, 0 10px 30px rgba(0, 0, 0, 0.6)",
        position: "relative",
      }}
    >
      {/* Lens Switcher & Entity Filter Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.5rem",
          padding: "0.65rem 1rem",
          background: "rgba(15, 23, 42, 0.95)",
          borderBottom: "1px solid rgba(51, 65, 85, 0.6)",
          zIndex: 10,
        }}
      >
        {/* Lens Mode Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginRight: "0.3rem" }}>
            LENS:
          </span>
          {(["high-level", "detailed", "call-graph", "focused"] as GraphMode[]).map((mode) => {
            const isActive = activeMode === mode;
            return (
              <button
                key={mode}
                onClick={() => onModeChange && onModeChange(mode)}
                style={{
                  padding: "0.25rem 0.65rem",
                  borderRadius: "5px",
                  fontSize: "0.76rem",
                  fontFamily: "ui-monospace, SFMono-Regular, monospace",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  border: isActive ? "1px solid #38bdf8" : "1px solid rgba(51, 65, 85, 0.5)",
                  background: isActive ? "rgba(56, 189, 248, 0.18)" : "rgba(30, 41, 59, 0.5)",
                  color: isActive ? "#38bdf8" : "#94a3b8",
                  transition: "all 0.2s ease",
                }}
              >
                {mode === "high-level"
                  ? "🏰 High-Level"
                  : mode === "detailed"
                  ? "🔬 Detailed Entities"
                  : mode === "call-graph"
                  ? "⚡ Call Graph"
                  : "🎯 Focused"}
              </button>
            );
          })}
        </div>

        {/* Entity Type Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
            FILTER:
          </span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              background: "#0f172a",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              color: "#cbd5e1",
              fontSize: "0.76rem",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <option value="all">All Node Types</option>
            <option value="file">📄 Files</option>
            <option value="class">🟣 Classes</option>
            <option value="interface">🔷 Interfaces</option>
            <option value="function">🔵 Functions</option>
            <option value="method">⚡ Methods</option>
            <option value="component">🧱 Components</option>
            <option value="folder">📁 Folders</option>
          </select>
        </div>
      </div>

      <FG2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height - 45}
        nodeCanvasObject={(node: CodeNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.label || node.name;
          const focused = isFocusedNode(node);
          const isHovered = hoverNode && hoverNode.id === node.id;
          const baseRadius = getNodeRadius(node, focused);

          const radius = baseRadius * (isHovered ? 1.25 : 1) * mountProgress;
          const color = getNodeColor(node, focused);
          const fontSize = (focused ? 13 : 11) / globalScale;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nx = (node as any).x;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ny = (node as any).y;
          if (nx === undefined || ny === undefined) return;

          const isNeighbor = !hoverNode || hoverNeighborSet.has(node.id);
          ctx.save();
          ctx.globalAlpha = (isNeighbor ? 1.0 : 0.2) * mountProgress;

          if (focused) {
            ctx.beginPath();
            ctx.arc(nx, ny, radius + 6, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(251, 191, 36, 0.35)";
            ctx.fill();
          }

          if (isHovered) {
            ctx.beginPath();
            ctx.arc(nx, ny, radius + 5, 0, 2 * Math.PI, false);
            ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(nx, ny, radius, 0, 2 * Math.PI, false);
          ctx.shadowBlur = (focused ? 12 : isHovered ? 10 : 4) / globalScale;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = focused ? "#ffffff" : "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = (focused ? 2 : 0.6) / globalScale;
          ctx.stroke();

          if (focused || isHovered || globalScale > 1.4) {
            ctx.font = `${focused ? "bold " : ""}${fontSize}px ui-monospace, SFMono-Regular, monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = focused ? "#fbbf24" : "#f8fafc";
            ctx.fillText(label, nx, ny + radius + fontSize + 2);
          }

          ctx.restore();
        }}
        nodeLabel={(node: CodeNode) => {
          const typeBadge = `${node.type.toUpperCase()}`;
          const badgeColor = getNodeColor(node, false);
          const lineInfo = node.startLine
            ? `Lines ${node.startLine}${node.endLine ? `–${node.endLine}` : ""}`
            : "";

          return `
            <div style="
              padding: 0.65rem 0.9rem;
              background: rgba(11, 15, 25, 0.94);
              backdrop-filter: blur(12px);
              border: 1px solid rgba(56, 189, 248, 0.35);
              border-radius: 8px;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(56, 189, 248, 0.15);
              font-family: ui-monospace, SFMono-Regular, monospace;
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
                ${lineInfo ? `<span style="font-size: 0.65rem; color: #64748b; background: rgba(51, 65, 85, 0.5); padding: 0.1rem 0.35rem; border-radius: 3px;">${lineInfo}</span>` : ""}
              </div>
              <div style="font-weight: 600; color: #f1f5f9; word-break: break-all; font-size: 0.85rem;">
                ${node.name}
              </div>
              <div style="margin-top: 0.3rem; font-size: 0.72rem; color: #94a3b8; word-break: break-all;">
                Path: ${node.path}
              </div>
            </div>
          `;
        }}
        nodeRelSize={6}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.35}
        warmupTicks={100}
        cooldownTicks={150}
        linkColor={(link: GraphLink) => getLinkColor(link, hoverNode)}
        linkWidth={(link: GraphLink) => {
          if (!hoverNode) return 1;
          const sId = getLinkId(link.source);
          const tId = getLinkId(link.target);
          return sId === hoverNode.id || tId === hoverNode.id ? 2.5 : 0.5;
        }}
        linkDirectionalArrowLength={(link: GraphLink) => {
          if (link.type === "calls" || link.type === "creates") return 4.5;
          return 3;
        }}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={(link: GraphLink) => {
          if (!hoverNode) return 0;
          const sId = getLinkId(link.source);
          const tId = getLinkId(link.target);
          return sId === hoverNode.id || tId === hoverNode.id ? 3 : 0;
        }}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleColor={(link: GraphLink) => getLinkColor(link, null)}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
      />
    </div>
  );
}
