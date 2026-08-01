"use client";

import { use, useState, useEffect } from "react";
import RepoGraph from "./RepoGraph";

// ---------------------------------------------------------------------------
// Types matching the /api/analyze response
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string;
  label: string;
  type: "file" | "folder";
}
interface GraphEdge {
  from: string;
  to: string;
}
interface AnalyzeResponse {
  overview: string;
  files: string[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * /repo/[id] — Repository detail page.
 *
 * On mount, calls /api/analyze with the decoded repo URL and renders:
 *   1. The decoded GitHub URL
 *   2. An interactive force-directed graph of TS files
 *   3. A Q&A input wired to /api/ask
 */
export default function RepoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // In Next.js 16 client components, params is a Promise — unwrap with use()
  const { id } = use(params);
  const repoUrl = decodeURIComponent(id);

  // --- Analysis state ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  // --- Q&A state ---
  const [question, setQuestion] = useState("");

  // --- Fetch analysis on mount ---
  useEffect(() => {
    let cancelled = false;

    async function analyze() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl }),
        });

        const json = await res.json();

        if (cancelled) return;

        if (!res.ok || json.error) {
          setError(json.error ?? `Request failed (${res.status})`);
        } else {
          setData(json as AnalyzeResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    analyze();
    return () => {
      cancelled = true;
    };
  }, [repoUrl]);

  // --- Handler: call /api/ask and log the result ---
  async function handleAsk() {
    if (!question.trim()) return;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, question }),
      });
      const json = await res.json();
      console.log("Ask response:", json);
    } catch (err) {
      console.error("Ask request failed:", err);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "64rem", margin: "0 auto" }}>
      {/* ---- Header ---- */}
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Repository</h1>
      <p style={{ marginTop: "0.5rem", wordBreak: "break-all" }}>{repoUrl}</p>

      {/* ---- Loading state ---- */}
      {loading && (
        <p style={{ marginTop: "1.5rem", color: "#888" }}>
          Analyzing repo…
        </p>
      )}

      {/* ---- Error state ---- */}
      {error && (
        <p style={{ marginTop: "1.5rem", color: "#ef4444" }}>
          Error: {error}
        </p>
      )}

      {/* ---- Analysis results ---- */}
      {data && (
        <>
          {/* Overview */}
          <p style={{ marginTop: "1rem", color: "#666" }}>{data.overview}</p>

          {/* File count summary */}
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "#888" }}>
            {data.files.length} TypeScript file{data.files.length !== 1 && "s"}{" "}
            found · {data.graph.nodes.length} nodes ·{" "}
            {data.graph.edges.length} edges
          </p>

          {/* Graph */}
          <div style={{ marginTop: "1.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Dependency Graph
            </h2>
            <RepoGraph nodes={data.graph.nodes} edges={data.graph.edges} />
            <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.5rem" }}>
              <span style={{ color: "#6366f1" }}>■</span> Folder&nbsp;&nbsp;
              <span style={{ color: "#22d3ee" }}>■</span> File&nbsp;&nbsp;
              · Hover for labels · Click to log node info
            </p>
          </div>
        </>
      )}

      {/* ---- Q&A section ---- */}
      <hr style={{ margin: "2rem 0" }} />
      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Ask a question
        </h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this repo…"
            style={{
              flex: 1,
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          <button
            onClick={handleAsk}
            style={{ padding: "0.5rem 1rem", cursor: "pointer" }}
          >
            Ask
          </button>
        </div>
        <p style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.25rem" }}>
          Check the browser console for the response.
        </p>
      </section>
    </main>
  );
}
