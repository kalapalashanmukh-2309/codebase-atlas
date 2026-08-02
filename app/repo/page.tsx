"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import RepoGraph from "./RepoGraph";
import InfoPanel from "./InfoPanel";
import GraphExplanation from "./GraphExplanation";
import CopyLinkButton from "./CopyLinkButton";
import { buildGraph, type GraphMode } from "@/lib/graph-builder";

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
  noSupportedFiles?: boolean;
}

// ---------------------------------------------------------------------------
// Suspense wrapper (useSearchParams requires a Suspense boundary)
// ---------------------------------------------------------------------------

export default function RepoPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            color: "#94a3b8",
          }}
        >
          Loading…
        </main>
      }
    >
      <RepoPageInner />
    </Suspense>
  );
}

// ---------------------------------------------------------------------------
// Inner page component
// ---------------------------------------------------------------------------

function RepoPageInner() {
  const searchParams = useSearchParams();
  const rawUrl = searchParams.get("url");

  // Decode the URL (encodeURIComponent was used when navigating here)
  const repoUrl = rawUrl ? decodeURIComponent(rawUrl) : null;

  // --- Analyze state ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  // --- Q&A state ---
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  // --- Graph Mode state ("high-level" | "detailed") ---
  const [graphMode, setGraphMode] = useState<GraphMode>("high-level");

  // Rebuild graph dynamically based on active graphMode and file list
  const activeGraph = data ? buildGraph(data.files, graphMode) : null;

  // --- Fetch repository analysis on mount ---
  useEffect(() => {
    if (!repoUrl) {
      setLoading(false);
      return;
    }

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
    if (!question.trim() || asking || !repoUrl) return;

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

  // --- Missing or invalid URL ---
  if (!repoUrl) {
    return (
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
          gap: "1.5rem",
        }}
      >
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "8px",
            background: "#450a0a",
            border: "1px solid #991b1b",
            color: "#fca5a5",
            maxWidth: "36rem",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fecaca", marginBottom: "0.75rem" }}>
            Missing Repository URL
          </h2>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Please go back and enter a valid GitHub repository URL.
          </p>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.9rem", color: "#fecaca" }}>
            Expected format:{" "}
            <code style={{ fontFamily: "monospace" }}>
              /repo?url=https%3A%2F%2Fgithub.com%2Fowner%2Frepo
            </code>
          </p>
        </div>
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "0.6rem 1.5rem",
            borderRadius: "6px",
            background: "#2563eb",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Go to Home
        </a>
      </main>
    );
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
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Repository</h1>
          <p style={{ wordBreak: "break-all", color: "#94a3b8", margin: 0 }}>{repoUrl}</p>
        </div>
        <CopyLinkButton />
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

      {/* 3. Analyze Error State Banner */}
      {error && (
        <div
          style={{
            padding: "1.5rem",
            borderRadius: "8px",
            background: "#450a0a",
            border: "1px solid #991b1b",
            color: "#fca5a5",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>⚠️</span>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fecaca" }}>
              Unable to analyze repository
            </h2>
          </div>

          <p style={{ margin: 0, lineHeight: 1.5, color: "#fee2e2" }}>{error}</p>

          <div
            style={{
              marginTop: "0.25rem",
              padding: "0.75rem 1rem",
              borderRadius: "6px",
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontSize: "0.9rem",
              color: "#fecaca",
            }}
          >
            💡 <strong>Expected GitHub URL format:</strong>{" "}
            <code style={{ fontFamily: "monospace" }}>https://github.com/owner/repository</code>
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            <a
              href="/"
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                background: "#ef4444",
                color: "#ffffff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              ← Try another repository URL
            </a>
          </div>
        </div>
      )}

      {/* 4. Analyze Success View */}
      {data && (
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Metadata info cards */}
          <InfoPanel
            repoUrl={repoUrl}
            filesCount={data.files.length}
            nodesCount={activeGraph?.nodes.length ?? 0}
            edgesCount={activeGraph?.edges.length ?? 0}
          />

          {data.noSupportedFiles || data.files.length === 0 ? (
            <div
              style={{
                padding: "1.5rem",
                borderRadius: "8px",
                background: "#1e293b",
                border: "1px solid #eab308",
                color: "#fef08a",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.25rem" }}>ℹ️</span>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fef08a", margin: 0 }}>
                  No TypeScript or JavaScript Files Found
                </h2>
              </div>
              <p style={{ margin: 0, lineHeight: 1.6, color: "#cbd5e1" }}>
                This repository doesn’t contain any TypeScript or JavaScript files, so Codebase Atlas can’t build a graph or overview for it yet.
              </p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#94a3b8" }}>
                💡 <em>You can still try asking questions about the repo below, but some features may be limited.</em>
              </p>
            </div>
          ) : (
            <>
              {/* AI Overview card */}
              {(() => {
                const isFallback =
                  data.overview.startsWith("Could not generate") ||
                  data.overview.startsWith("GEMINI_API_KEY");

                return (
                  <div
                    style={{
                      padding: "1.25rem",
                      borderRadius: "8px",
                      background: isFallback ? "#1c1917" : "#1e293b",
                      border: `1px solid ${isFallback ? "#854d0e" : "#334155"}`,
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                        color: isFallback ? "#fbbf24" : "#38bdf8",
                      }}
                    >
                      {isFallback ? "⚠ AI Overview Unavailable" : "✨ AI Overview of This Repository"}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        lineHeight: 1.6,
                        fontSize: "0.95rem",
                        color: isFallback ? "#d6d3d1" : "#cbd5e1",
                      }}
                    >
                      {data.overview}
                    </p>
                  </div>
                );
              })()}

              {/* Interactive Force Graph */}
              {activeGraph && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 600,
                      }}
                    >
                      Dependency Graph
                    </h2>

                    {/* Mode Toggle */}
                    <div
                      style={{
                        display: "flex",
                        background: "#1e293b",
                        padding: "0.25rem",
                        borderRadius: "6px",
                        border: "1px solid #334155",
                      }}
                    >
                      <button
                        onClick={() => setGraphMode("high-level")}
                        style={{
                          padding: "0.35rem 0.85rem",
                          borderRadius: "4px",
                          border: "none",
                          background: graphMode === "high-level" ? "#2563eb" : "transparent",
                          color: graphMode === "high-level" ? "#ffffff" : "#94a3b8",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        High-level
                      </button>
                      <button
                        onClick={() => setGraphMode("detailed")}
                        style={{
                          padding: "0.35rem 0.85rem",
                          borderRadius: "4px",
                          border: "none",
                          background: graphMode === "detailed" ? "#2563eb" : "transparent",
                          color: graphMode === "detailed" ? "#ffffff" : "#94a3b8",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Detailed
                      </button>
                    </div>
                  </div>

                  <GraphExplanation />
                  <RepoGraph nodes={activeGraph.nodes} edges={activeGraph.edges} />
                </div>
              )}
            </>
          )}
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
