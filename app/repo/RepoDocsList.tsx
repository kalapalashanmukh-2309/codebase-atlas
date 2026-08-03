"use client";

import { useState, useEffect, useCallback } from "react";
import { getDocsPagesForRepo, type DocsPage } from "@/lib/docs-pages";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RepoDocsListProps {
  repoUrl: string;
  refreshKey?: number;
  onOpenDocsPage: (page: DocsPage) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RepoDocsList({
  repoUrl,
  refreshKey,
  onOpenDocsPage,
}: RepoDocsListProps) {
  const [pages, setPages] = useState<DocsPage[]>([]);

  const load = useCallback(() => {
    setPages(getDocsPagesForRepo(repoUrl));
  }, [repoUrl]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (pages.length === 0) return null;

  return (
    <div
      style={{
        padding: "1.25rem",
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
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "0.75rem",
          borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.2rem" }}>📖</span>
          <h3
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: "#f8fafc",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            Living Documentation ({pages.length})
          </h3>
        </div>
      </div>

      {/* Pages Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {pages.map((page) => (
          <div
            key={page.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              background: "rgba(3, 7, 18, 0.75)",
              border: "1px solid rgba(51, 65, 85, 0.5)",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            {/* Info */}
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
                    fontWeight: 700,
                    color: "#f1f5f9",
                    fontSize: "0.9rem",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {page.title}
                </span>

                {/* Slug Badge */}
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "0.1rem 0.35rem",
                    borderRadius: "4px",
                    fontFamily: "ui-monospace, monospace",
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    color: "#38bdf8",
                  }}
                >
                  /{page.slug}
                </span>

                {/* Graph Mode Badge */}
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.1rem 0.35rem",
                    borderRadius: "3px",
                    fontWeight: 700,
                    fontFamily: "ui-monospace, monospace",
                    textTransform: "uppercase",
                    background:
                      page.graphMode === "detailed"
                        ? "rgba(52, 211, 153, 0.12)"
                        : "rgba(99, 102, 241, 0.12)",
                    color:
                      page.graphMode === "detailed" ? "#34d399" : "#818cf8",
                    border: `1px solid ${
                      page.graphMode === "detailed"
                        ? "rgba(52, 211, 153, 0.3)"
                        : "rgba(99, 102, 241, 0.3)"
                    }`,
                  }}
                >
                  {page.graphMode}
                </span>

                {/* Focus Files Count */}
                {page.focusFiles && page.focusFiles.length > 0 && (
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
                    {page.focusFiles.length} file{page.focusFiles.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Summary */}
              {page.summary && (
                <p
                  style={{
                    margin: "0.3rem 0 0",
                    fontSize: "0.82rem",
                    color: "#94a3b8",
                    lineHeight: 1.45,
                  }}
                >
                  {page.summary}
                </p>
              )}
            </div>

            {/* Open Action Button */}
            <button
              onClick={() => onOpenDocsPage(page)}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
                whiteSpace: "nowrap",
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
          </div>
        ))}
      </div>
    </div>
  );
}
