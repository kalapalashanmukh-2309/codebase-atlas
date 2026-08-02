"use client";

import { useEffect, useRef, useState } from "react";

interface FileViewerModalProps {
  repoUrl: string;
  focusFile: string;
  lines?: string | null;
  onClose: () => void;
}

/**
 * Parses line range string like "10-22" or "15" into [startLine, endLine].
 */
function parseLineRange(linesStr?: string | null): [number, number] | null {
  if (!linesStr || !linesStr.trim()) return null;
  const parts = linesStr.split("-").map((p) => parseInt(p.trim(), 10));
  if (parts.length === 1 && !isNaN(parts[0])) {
    return [parts[0], parts[0]];
  }
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [Math.min(parts[0], parts[1]), Math.max(parts[0], parts[1])];
  }
  return null;
}

export default function FileViewerModal({
  repoUrl,
  focusFile,
  lines,
  onClose,
}: FileViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);

  const range = parseLineRange(lines);
  const [startLine, endLine] = range ? range : [-1, -1];

  const firstHighlightedRef = useRef<HTMLDivElement | null>(null);

  // Fetch raw file content on mount or when focusFile changes
  useEffect(() => {
    let cancelled = false;

    async function loadFile() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/file?url=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(focusFile)}`
        );
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok || data.error) {
          setError(data.error || `Failed to fetch file (${res.status})`);
        } else {
          setContent(data.content);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error loading file content.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFile();
    return () => {
      cancelled = true;
    };
  }, [repoUrl, focusFile]);

  // Scroll first highlighted line into view automatically
  useEffect(() => {
    if (!loading && content && firstHighlightedRef.current) {
      setTimeout(() => {
        firstHighlightedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    }
  }, [loading, content, startLine, endLine]);

  const fileLines = content ? content.split("\n") : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "52rem",
          maxHeight: "85vh",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "0.85rem 1.25rem",
            background: "#1e293b",
            borderBottom: "1px solid #334155",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.1rem" }}>📄</span>
            <span style={{ fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 600, color: "#38bdf8" }}>
              {focusFile}
            </span>
            {startLine > 0 && (
              <span
                style={{
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                  color: "#fbbf24",
                  background: "rgba(245, 158, 11, 0.15)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  fontWeight: 600,
                }}
              >
                Lines {startLine}–{endLine}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.25rem",
              fontWeight: "bold",
              cursor: "pointer",
              padding: "0.2rem 0.5rem",
              borderRadius: "4px",
            }}
            title="Close viewer"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem 0",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "0.85rem",
            lineHeight: "1.6",
            color: "#e2e8f0",
          }}
        >
          {loading && (
            <div style={{ padding: "2rem", color: "#94a3b8", textAlign: "center" }}>
              Fetching file content from GitHub…
            </div>
          )}

          {error && (
            <div style={{ padding: "2rem", color: "#fca5a5", textAlign: "center" }}>
              <strong>Error loading file:</strong> {error}
            </div>
          )}

          {!loading && !error && fileLines.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {fileLines.map((lineText, idx) => {
                const lineNum = idx + 1;
                const isHighlighted = lineNum >= startLine && lineNum <= endLine;
                const isFirstHighlighted = lineNum === startLine;

                return (
                  <div
                    key={lineNum}
                    ref={isFirstHighlighted ? firstHighlightedRef : null}
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      background: isHighlighted ? "rgba(245, 158, 11, 0.18)" : "transparent",
                      borderLeft: isHighlighted ? "4px solid #f59e0b" : "4px solid transparent",
                      padding: "0 1rem",
                      transition: "background 0.2s ease",
                    }}
                  >
                    {/* Line Number */}
                    <span
                      style={{
                        width: "3.5rem",
                        flexShrink: 0,
                        userSelect: "none",
                        color: isHighlighted ? "#fbbf24" : "#475569",
                        fontWeight: isHighlighted ? 700 : 400,
                        textAlign: "right",
                        paddingRight: "1.25rem",
                      }}
                    >
                      {lineNum}
                    </span>

                    {/* Line Content */}
                    <span
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        color: isHighlighted ? "#fffbe1" : "#e2e8f0",
                        fontWeight: isHighlighted ? 600 : 400,
                      }}
                    >
                      {lineText || " "}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
