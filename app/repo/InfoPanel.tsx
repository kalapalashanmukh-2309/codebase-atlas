"use client";

/**
 * InfoPanel — displays key metadata about the analyzed repository.
 *
 * Shown above the graph on the /repo/[id] page.
 */

interface InfoPanelProps {
  repoUrl: string;
  filesCount: number;
  nodesCount: number;
  edgesCount: number;
}

/**
 * Parse "owner/repo" from a GitHub URL for display.
 * Falls back to the full URL if parsing fails.
 */
function extractRepoName(url: string): string {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  } catch {
    // ignore
  }
  return url;
}

export default function InfoPanel({
  repoUrl,
  filesCount,
  nodesCount,
  edgesCount,
}: InfoPanelProps) {
  const repoName = extractRepoName(repoUrl);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "1rem",
        padding: "1.25rem",
        borderRadius: "8px",
        border: "1px solid #334155",
        background: "#1e293b",
      }}
    >
      {/* Repo name + link */}
      <div>
        <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
          Repository
        </p>
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "1.05rem",
            fontWeight: 600,
            color: "#38bdf8",
            textDecoration: "none",
          }}
        >
          {repoName} ↗
        </a>
      </div>

      {/* TS file count */}
      <div>
        <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
          Source Files
        </p>
        <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc" }}>{filesCount}</p>
      </div>

      {/* Graph nodes */}
      <div>
        <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
          Graph Nodes
        </p>
        <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc" }}>{nodesCount}</p>
      </div>

      {/* Graph edges */}
      <div>
        <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
          Graph Edges
        </p>
        <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc" }}>{edgesCount}</p>
      </div>
    </div>
  );
}
