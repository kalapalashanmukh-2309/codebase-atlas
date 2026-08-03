"use client";

import { useState, useEffect, useCallback } from "react";
import { getSavedViewsForRepo, deleteView, type SavedView } from "@/lib/saved-views";
import { buildRepoUrl } from "@/lib/url-builder";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SavedViewsListProps {
  repoUrl: string;
  /** Bumped externally after a new view is saved so the list re-fetches. */
  refreshKey?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SavedViewsList — renders saved views for the current repo from localStorage.
 * Each card shows title, description, graph mode badge, and Open / Delete actions.
 */
export default function SavedViewsList({ repoUrl, refreshKey }: SavedViewsListProps) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [deletedId, setDeletedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(() => {
    setViews(getSavedViewsForRepo(repoUrl));
  }, [repoUrl]);

  // Re-read localStorage whenever repoUrl or refreshKey changes
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function handleDelete(id: string) {
    setDeletedId(id);
    setTimeout(() => {
      deleteView(id);
      setDeletedId(null);
      load();
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
        // Fallback: prompt user
        window.prompt("Copy this link:", fullUrl);
      }
    );
  }

  if (views.length === 0) return null;

  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "10px",
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(56, 189, 248, 0.15)",
        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.35), 0 0 16px rgba(56, 189, 248, 0.04)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "0.92rem",
            fontWeight: 700,
            color: "#e2e8f0",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          📌 Saved Views
          <span
            style={{
              fontSize: "0.7rem",
              padding: "0.1rem 0.4rem",
              borderRadius: "4px",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              color: "#38bdf8",
              fontWeight: 600,
            }}
          >
            {views.length}
          </span>
        </h3>
      </div>

      {/* View Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {views.map((view) => {
          const isDeleting = deletedId === view.id;
          const date = new Date(view.createdAt);
          const dateStr = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={view.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                background: "rgba(3, 7, 18, 0.7)",
                border: "1px solid rgba(51, 65, 85, 0.5)",
                opacity: isDeleting ? 0.3 : 1,
                transition: "opacity 0.3s, border-color 0.2s",
              }}
            >
              {/* Left: Title + Meta */}
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
                      fontSize: "0.88rem",
                      fontFamily: "ui-monospace, monospace",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "220px",
                    }}
                  >
                    {view.title}
                  </span>

                  {/* Graph mode badge */}
                  <span
                    style={{
                      fontSize: "0.65rem",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "3px",
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

                  {/* Focus files count */}
                  {view.focusFiles && view.focusFiles.length > 0 && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.1rem 0.35rem",
                        borderRadius: "3px",
                        fontFamily: "ui-monospace, monospace",
                        background: "rgba(251, 191, 36, 0.1)",
                        border: "1px solid rgba(251, 191, 36, 0.25)",
                        color: "#fbbf24",
                      }}
                    >
                      {view.focusFiles.length} file{view.focusFiles.length > 1 ? "s" : ""} focused
                    </span>
                  )}

                  {/* Date */}
                  <span
                    style={{
                      fontSize: "0.68rem",
                      color: "#64748b",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    {dateStr}
                  </span>
                </div>

                {/* Optional description */}
                {view.description && (
                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      fontSize: "0.78rem",
                      color: "#94a3b8",
                      lineHeight: 1.4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "350px",
                    }}
                  >
                    {view.description}
                  </p>
                )}
              </div>

              {/* Right: Open + Delete */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                <button
                  onClick={() => handleOpen(view)}
                  style={{
                    padding: "0.35rem 0.6rem",
                    borderRadius: "5px",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    background: "rgba(56, 189, 248, 0.1)",
                    color: "#38bdf8",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "ui-monospace, monospace",
                    transition: "background 0.2s, border-color 0.2s",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(56, 189, 248, 0.2)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56, 189, 248, 0.5)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(56, 189, 248, 0.1)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56, 189, 248, 0.3)";
                  }}
                >
                  ▶ Open
                </button>

                {/* Copy permalink button */}
                {copiedId === view.id ? (
                  <span
                    style={{
                      padding: "0.35rem 0.5rem",
                      borderRadius: "5px",
                      background: "rgba(52, 211, 153, 0.12)",
                      border: "1px solid rgba(52, 211, 153, 0.35)",
                      color: "#34d399",
                      fontSize: "0.72rem",
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
                      padding: "0.35rem 0.5rem",
                      borderRadius: "5px",
                      border: "1px solid rgba(51, 65, 85, 0.5)",
                      background: "transparent",
                      color: "#94a3b8",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      fontFamily: "ui-monospace, monospace",
                      transition: "color 0.2s, border-color 0.2s",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#38bdf8";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56, 189, 248, 0.4)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(51, 65, 85, 0.5)";
                    }}
                  >
                    🔗
                  </button>
                )}

                <button
                  onClick={() => handleDelete(view.id)}
                  title="Delete this saved view"
                  style={{
                    padding: "0.35rem 0.5rem",
                    borderRadius: "5px",
                    border: "1px solid rgba(51, 65, 85, 0.5)",
                    background: "transparent",
                    color: "#64748b",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    fontFamily: "ui-monospace, monospace",
                    transition: "color 0.2s, border-color 0.2s",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(248, 113, 113, 0.4)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(51, 65, 85, 0.5)";
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
