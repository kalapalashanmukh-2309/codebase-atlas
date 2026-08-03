"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSavedViews, deleteView, type SavedView } from "@/lib/saved-views";
import { buildRepoUrl } from "@/lib/url-builder";
import { formatRepoName } from "@/lib/recent-analyses";

/**
 * /saved — Displays all saved views across all repositories, grouped by repoUrl.
 */
export default function SavedViewsPage() {
  const [views, setViews] = useState<SavedView[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletedId, setDeletedId] = useState<string | null>(null);

  useEffect(() => {
    setViews(getSavedViews());
  }, []);

  function handleDelete(id: string) {
    setDeletedId(id);
    setTimeout(() => {
      deleteView(id);
      setDeletedId(null);
      setViews(getSavedViews());
    }, 300);
  }

  function handleOpen(view: SavedView) {
    const url = buildRepoUrl(view.repoUrl, {
      graphMode: view.graphMode,
      focusFiles: view.focusFiles,
    });
    window.location.href = url;
  }

  function handleCopyLink(view: SavedView) {
    const url = buildRepoUrl(view.repoUrl, {
      graphMode: view.graphMode,
      focusFiles: view.focusFiles,
    });
    const fullUrl = `${window.location.origin}${url}`;

    navigator.clipboard.writeText(fullUrl).then(
      () => {
        setCopiedId(view.id);
        setTimeout(() => setCopiedId(null), 1500);
      },
      () => {
        window.prompt("Copy this link:", fullUrl);
      }
    );
  }

  // Group saved views by repoUrl
  const grouped = views.reduce<Record<string, SavedView[]>>((acc, view) => {
    if (!acc[view.repoUrl]) {
      acc[view.repoUrl] = [];
    }
    acc[view.repoUrl].push(view);
    return acc;
  }, {});

  const repoUrls = Object.keys(grouped);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        padding: "3rem 2rem",
        maxWidth: "56rem",
        margin: "0 auto",
        color: "#f8fafc",
        minHeight: "100vh",
      }}
    >
      {/* Top Navbar */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "1rem",
          borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#38bdf8",
            textDecoration: "none",
            fontSize: "1rem",
            fontWeight: 600,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          ← Codebase Atlas
        </Link>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
          <Link
            href="/missions"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            🎯 Missions
          </Link>
          <Link
            href="/onboarding"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            🗺️ Onboarding
          </Link>
          <Link
            href="/saved"
            style={{
              color: "#38bdf8",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            📌 Saved Views
          </Link>
          <Link
            href="/docs"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            📖 Docs
          </Link>
        </div>
      </nav>

      {/* Title section */}
      <div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            margin: 0,
            color: "#f8fafc",
          }}
        >
          Saved Views
        </h1>
        <p
          style={{
            color: "#94a3b8",
            marginTop: "0.5rem",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          Your collection of saved architecture views, flows, and subgraphs across repositories.
        </p>
      </div>

      {/* Empty State */}
      {repoUrls.length === 0 ? (
        <div
          style={{
            padding: "3rem 2rem",
            borderRadius: "12px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(51, 65, 85, 0.5)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "2.5rem" }}>📌</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0, color: "#e2e8f0" }}>
            No Saved Views Yet
          </h2>
          <p style={{ color: "#94a3b8", maxWidth: "28rem", margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>
            When viewing any repository graph, click the <strong>&quot;Save this view&quot;</strong> button in the header to bookmark custom focus states and architectural flows.
          </p>
          <Link
            href="/"
            style={{
              marginTop: "0.5rem",
              padding: "0.6rem 1.2rem",
              borderRadius: "6px",
              background: "#0284c7",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}
          >
            Analyze a Repository
          </Link>
        </div>
      ) : (
        /* Repository Groups */
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {repoUrls.map((repoUrl) => {
            const repoViews = grouped[repoUrl];
            const repoName = formatRepoName(repoUrl);

            return (
              <section
                key={repoUrl}
                style={{
                  padding: "1.25rem 1.5rem",
                  borderRadius: "12px",
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {/* Repo Group Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    paddingBottom: "0.75rem",
                    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>📦</span>
                    <Link
                      href={buildRepoUrl(repoUrl)}
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#38bdf8",
                        textDecoration: "none",
                        fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      }}
                    >
                      {repoName}
                    </Link>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        background: "rgba(56, 189, 248, 0.1)",
                        border: "1px solid rgba(56, 189, 248, 0.25)",
                        color: "#38bdf8",
                        fontWeight: 600,
                      }}
                    >
                      {repoViews.length} view{repoViews.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "0.78rem",
                      color: "#64748b",
                      fontFamily: "ui-monospace, monospace",
                      wordBreak: "break-all",
                    }}
                  >
                    {repoUrl}
                  </span>
                </div>

                {/* Saved View Items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {repoViews.map((view) => {
                    const isDeleting = deletedId === view.id;
                    const date = new Date(view.createdAt);
                    const dateStr = date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <div
                        key={view.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "1rem",
                          padding: "0.75rem 1rem",
                          borderRadius: "8px",
                          background: "rgba(3, 7, 18, 0.75)",
                          border: "1px solid rgba(51, 65, 85, 0.5)",
                          opacity: isDeleting ? 0.3 : 1,
                          transition: "opacity 0.3s, border-color 0.2s",
                        }}
                      >
                        {/* Info Column */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 600,
                                color: "#f1f5f9",
                                fontSize: "0.92rem",
                                fontFamily: "ui-monospace, monospace",
                              }}
                            >
                              {view.title}
                            </span>

                            {/* Graph mode badge */}
                            <span
                              style={{
                                fontSize: "0.65rem",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                fontWeight: 700,
                                fontFamily: "ui-monospace, monospace",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                background:
                                  view.graphMode === "detailed"
                                    ? "rgba(52, 211, 153, 0.12)"
                                    : "rgba(99, 102, 241, 0.12)",
                                color:
                                  view.graphMode === "detailed" ? "#34d399" : "#818cf8",
                                border: `1px solid ${
                                  view.graphMode === "detailed"
                                    ? "rgba(52, 211, 153, 0.3)"
                                    : "rgba(99, 102, 241, 0.3)"
                                }`,
                              }}
                            >
                              {view.graphMode}
                            </span>

                            {/* Focus files badge */}
                            {view.focusFiles && view.focusFiles.length > 0 && (
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  padding: "0.1rem 0.4rem",
                                  borderRadius: "4px",
                                  fontFamily: "ui-monospace, monospace",
                                  background: "rgba(251, 191, 36, 0.1)",
                                  border: "1px solid rgba(251, 191, 36, 0.25)",
                                  color: "#fbbf24",
                                }}
                              >
                                {view.focusFiles.length} file
                                {view.focusFiles.length > 1 ? "s" : ""} focused
                              </span>
                            )}

                            {/* Date */}
                            <span
                              style={{
                                fontSize: "0.72rem",
                                color: "#64748b",
                                fontFamily: "ui-monospace, monospace",
                              }}
                            >
                              {dateStr}
                            </span>
                          </div>

                          {/* Description */}
                          {view.description && (
                            <p
                              style={{
                                margin: "0.35rem 0 0",
                                fontSize: "0.82rem",
                                color: "#94a3b8",
                                lineHeight: 1.4,
                              }}
                            >
                              {view.description}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            flexShrink: 0,
                          }}
                        >
                          <button
                            onClick={() => handleOpen(view)}
                            style={{
                              padding: "0.4rem 0.75rem",
                              borderRadius: "6px",
                              border: "1px solid rgba(56, 189, 248, 0.35)",
                              background: "rgba(56, 189, 248, 0.12)",
                              color: "#38bdf8",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "ui-monospace, monospace",
                              transition: "background 0.2s, border-color 0.2s",
                            }}
                            onMouseOver={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "rgba(56, 189, 248, 0.25)";
                              (e.currentTarget as HTMLButtonElement).style.borderColor =
                                "rgba(56, 189, 248, 0.6)";
                            }}
                            onMouseOut={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "rgba(56, 189, 248, 0.12)";
                              (e.currentTarget as HTMLButtonElement).style.borderColor =
                                "rgba(56, 189, 248, 0.35)";
                            }}
                          >
                            ▶ Open
                          </button>

                          {copiedId === view.id ? (
                            <span
                              style={{
                                padding: "0.4rem 0.6rem",
                                borderRadius: "6px",
                                background: "rgba(52, 211, 153, 0.12)",
                                border: "1px solid rgba(52, 211, 153, 0.35)",
                                color: "#34d399",
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                fontFamily: "ui-monospace, monospace",
                              }}
                            >
                              ✓ Copied
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCopyLink(view)}
                              title="Copy shareable permalink"
                              style={{
                                padding: "0.4rem 0.6rem",
                                borderRadius: "6px",
                                border: "1px solid rgba(51, 65, 85, 0.5)",
                                background: "transparent",
                                color: "#94a3b8",
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                fontFamily: "ui-monospace, monospace",
                                transition: "color 0.2s, border-color 0.2s",
                              }}
                              onMouseOver={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color =
                                  "#38bdf8";
                                (e.currentTarget as HTMLButtonElement).style.borderColor =
                                  "rgba(56, 189, 248, 0.4)";
                              }}
                              onMouseOut={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.color =
                                  "#94a3b8";
                                (e.currentTarget as HTMLButtonElement).style.borderColor =
                                  "rgba(51, 65, 85, 0.5)";
                              }}
                            >
                              🔗
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(view.id)}
                            title="Delete this saved view"
                            style={{
                              padding: "0.4rem 0.6rem",
                              borderRadius: "6px",
                              border: "1px solid rgba(51, 65, 85, 0.5)",
                              background: "transparent",
                              color: "#64748b",
                              fontSize: "0.82rem",
                              cursor: "pointer",
                              fontFamily: "ui-monospace, monospace",
                              transition: "color 0.2s, border-color 0.2s",
                            }}
                            onMouseOver={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color =
                                "#f87171";
                              (e.currentTarget as HTMLButtonElement).style.borderColor =
                                "rgba(248, 113, 113, 0.4)";
                            }}
                            onMouseOut={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.color =
                                "#64748b";
                              (e.currentTarget as HTMLButtonElement).style.borderColor =
                                "rgba(51, 65, 85, 0.5)";
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
