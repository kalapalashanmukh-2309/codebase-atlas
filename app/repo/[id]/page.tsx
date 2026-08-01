"use client";

import { use, useState, useEffect } from "react";
import RepoGraph from "./RepoGraph";
import InfoPanel from "./InfoPanel";

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
 * Uses a simple column layout to display:
 *   1. Repository URL Header
 *   2. Analysis state (loading, error, or InfoPanel + AI Overview + Dependency Graph)
 *   3. Q&A section with dedicated loading, error, and answer states
 */
export default function RepoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap route params
  const { id } = use(params);
  const repoUrl = decodeURIComponent(id);

  // --- Analyze state ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  // --- Q&A state ---
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  // --- Fetch repository analysis on mount ---
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
          setError(json.error ?? `Analysis request failed with status ${res.status}`);
        } else {
          setData(json as AnalyzeResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error during analysis.");
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

  // --- Handler: submit question to /api/ask ---
  async function handleAsk() {
    if (!question.trim() || asking) return;

    setAsking(true);
    setAskError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, question: question.trim() }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setAskError(json.error ?? `Q&A request failed with status ${res.status}`);
      } else {
        setAnswer(json.answer);
      }
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Failed to fetch Q&A answer.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        padding: "2rem",
        maxWidth: "64rem",
        margin: "0 auto",
      }}
    >
      {/* 1. Header */}
      <header style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Repository</h1>
        <p style={{ wordBreak: "break-all", color: "#94a3b8" }}>{repoUrl}</p>
      </header>

      {/* 2. Analyze Loading State */}
      {loading && (
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "8px",
            background: "#1e293b",
            border: "1px solid #334155",
            color: "#94a3b8",
          }}
        >
          Analyzing repository structure and generating AI overview…
        </div>
      )}

      {/* 3. Analyze Error State */}
      {error && (
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "8px",
            background: "#450a0a",
            border: "1px solid #991b1b",
            color: "#fca5a5",
          }}
        >
          <strong>Analysis Error:</strong> {error}
        </div>
      )}

      {/* 4. Analyze Success View */}
      {data && (
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Metadata info cards */}
          <InfoPanel
            repoUrl={repoUrl}
            filesCount={data.files.length}
            nodesCount={data.graph.nodes.length}
            edgesCount={data.graph.edges.length}
          />

          {/* AI Overview paragraph */}
          <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>{data.overview}</p>

          {/* Interactive Force Graph */}
          <div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "0.75rem",
              }}
            >
              Dependency Graph
            </h2>
            <RepoGraph nodes={data.graph.nodes} edges={data.graph.edges} />
            <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.5rem" }}>
              <span style={{ color: "#6366f1" }}>■</span> Folder&nbsp;&nbsp;
              <span style={{ color: "#22d3ee" }}>■</span> File&nbsp;&nbsp;
              · Hover for labels · Click to log node info
            </p>
          </div>
        </section>
      )}

      {/* 5. Q&A Section */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          borderTop: "1px solid #334155",
          paddingTop: "2rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          Ask a question about this repository
        </h2>

        {/* Input box and action button */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. How is routing set up? Where are the main components located?"
            rows={3}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "6px",
              border: "1px solid #334155",
              background: "#1e293b",
              color: "#f8fafc",
              fontSize: "0.95rem",
              resize: "vertical",
            }}
          />
          <div>
            <button
              onClick={handleAsk}
              disabled={asking || !question.trim()}
              style={{
                padding: "0.6rem 1.5rem",
                borderRadius: "6px",
                border: "none",
                background: asking || !question.trim() ? "#475569" : "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                cursor: asking || !question.trim() ? "not-allowed" : "pointer",
              }}
            >
              {asking ? "Thinking..." : "Ask Question"}
            </button>
          </div>
        </div>

        {/* Ask Loading State */}
        {asking && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "6px",
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#94a3b8",
            }}
          >
            Searching repository context and generating answer…
          </div>
        )}

        {/* Ask Error State */}
        {askError && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "6px",
              background: "#450a0a",
              border: "1px solid #991b1b",
              color: "#fca5a5",
            }}
          >
            <strong>Q&amp;A Error:</strong> {askError}
          </div>
        )}

        {/* Ask Answer Display */}
        {answer && (
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "8px",
              background: "#1e293b",
              border: "1px solid #334155",
              color: "#f8fafc",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "#38bdf8",
                marginBottom: "0.5rem",
              }}
            >
              Answer
            </h3>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: "0.95rem" }}>
              {answer}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
