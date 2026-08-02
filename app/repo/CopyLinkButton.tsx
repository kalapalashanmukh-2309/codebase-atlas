"use client";

import { useState } from "react";

/**
 * CopyLinkButton — copies current URL to clipboard with user feedback
 */
export default function CopyLinkButton() {
  const [copied, setCopied] = useState<boolean | null>(null);
  const [error, setError] = useState(false);

  async function handleCopy() {
    try {
      if (typeof window !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setError(false);
        setTimeout(() => setCopied(null), 3000);
      } else {
        throw new Error("Clipboard API unavailable");
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
          padding: "0.5rem 0.85rem",
          borderRadius: "6px",
          background: "#1e293b",
          border: "1px solid #334155",
          color: "#f8fafc",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <span>🔗</span> Copy link to this analysis
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
