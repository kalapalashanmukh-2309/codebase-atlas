"use client";

import { useState } from "react";
import { buildRepoUrl } from "@/lib/url-builder";
import type { GraphMode } from "@/lib/graph-builder";

interface CopyLinkButtonProps {
  label?: string;
  repoUrl?: string | null;
  graphMode?: GraphMode;
  focusFile?: string | null;
  focusFiles?: string[];
}

/**
 * CopyLinkButton — copies current view URL to clipboard with user feedback
 */
export default function CopyLinkButton({
  label = "Copy link to this view",
  repoUrl,
  graphMode,
  focusFile,
  focusFiles,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const [error, setError] = useState(false);

  async function handleCopy() {
    try {
      if (typeof window !== "undefined") {
        let textToCopy = window.location.href;

        if (repoUrl) {
          const relativeUrl = buildRepoUrl(repoUrl, {
            graphMode,
            focusFile,
            focusFiles,
          });
          textToCopy = `${window.location.origin}${relativeUrl}`;
        }

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(textToCopy);
          setCopied(true);
          setError(false);
          setTimeout(() => setCopied(null), 3000);
        } else {
          throw new Error("Clipboard API unavailable");
        }
      }
    } catch {
      setError(true);
      setCopied(false);
      setTimeout(() => {
        setError(false);
        setCopied(null);
      }, 4000);
    }
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
      <button
        onClick={handleCopy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.45rem 0.85rem",
          borderRadius: "6px",
          background: "#1e293b",
          border: "1px solid #334155",
          color: "#f8fafc",
          fontSize: "0.85rem",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <span>🔗</span> {label}
      </button>

      {copied && (
        <span style={{ fontSize: "0.85rem", color: "#4ade80", fontWeight: 500 }}>
          ✓ Link copied!
        </span>
      )}

      {error && (
        <span style={{ fontSize: "0.85rem", color: "#fca5a5" }}>
          Could not copy link. You can copy it manually from the address bar.
        </span>
      )}
    </div>
  );
}
