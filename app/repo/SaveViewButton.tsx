"use client";

import { useState } from "react";
import { saveView } from "@/lib/saved-views";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SaveViewButtonProps {
  repoUrl: string;
  graphMode: "high-level" | "detailed";
  focusFiles?: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SaveViewButton — renders a "Save this view" button that opens a small
 * inline form for naming the view. On submit it persists the current
 * graph mode + focus files to localStorage via the saved-views helpers.
 */
export default function SaveViewButton({
  repoUrl,
  graphMode,
  focusFiles,
}: SaveViewButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    saveView({
      repoUrl,
      title: title.trim(),
      description: description.trim() || undefined,
      graphMode,
      focusFiles: focusFiles && focusFiles.length > 0 ? focusFiles : undefined,
    });

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
      setTitle("");
      setDescription("");
    }, 1500);
  }

  // Success flash
  if (saved) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          padding: "0.5rem 0.85rem",
          borderRadius: "6px",
          background: "rgba(52, 211, 153, 0.15)",
          border: "1px solid rgba(52, 211, 153, 0.4)",
          color: "#34d399",
          fontSize: "0.85rem",
          fontWeight: 600,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        ✓ View saved
      </span>
    );
  }

  // Collapsed state — just the trigger button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.5rem 0.85rem",
          borderRadius: "6px",
          background: "rgba(15, 23, 42, 0.85)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          color: "#38bdf8",
          fontSize: "0.85rem",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "ui-monospace, monospace",
          transition: "border-color 0.2s, background 0.2s",
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56, 189, 248, 0.5)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(15, 23, 42, 1)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56, 189, 248, 0.25)";
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(15, 23, 42, 0.85)";
        }}
      >
        💾 Save this view
      </button>
    );
  }

  // Expanded state — inline form
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "0.5rem",
        padding: "0.6rem 0.75rem",
        borderRadius: "8px",
        background: "rgba(11, 15, 25, 0.94)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(56, 189, 248, 0.3)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(56, 189, 248, 0.08)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <input
          type="text"
          placeholder="View name (e.g. Auth flow)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          required
          style={{
            padding: "0.4rem 0.6rem",
            borderRadius: "5px",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            background: "rgba(15, 23, 42, 0.9)",
            color: "#f1f5f9",
            fontSize: "0.82rem",
            fontFamily: "ui-monospace, monospace",
            outline: "none",
            width: "200px",
          }}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            padding: "0.35rem 0.6rem",
            borderRadius: "5px",
            border: "1px solid rgba(51, 65, 85, 0.5)",
            background: "rgba(15, 23, 42, 0.9)",
            color: "#94a3b8",
            fontSize: "0.78rem",
            fontFamily: "ui-monospace, monospace",
            outline: "none",
            width: "200px",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!title.trim()}
        style={{
          padding: "0.45rem 0.7rem",
          borderRadius: "5px",
          border: "1px solid rgba(52, 211, 153, 0.4)",
          background: "rgba(52, 211, 153, 0.15)",
          color: title.trim() ? "#34d399" : "#475569",
          fontSize: "0.82rem",
          fontWeight: 600,
          cursor: title.trim() ? "pointer" : "not-allowed",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        Save
      </button>

      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setTitle("");
          setDescription("");
        }}
        style={{
          padding: "0.45rem 0.55rem",
          borderRadius: "5px",
          border: "1px solid rgba(51, 65, 85, 0.5)",
          background: "transparent",
          color: "#64748b",
          fontSize: "0.82rem",
          cursor: "pointer",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        ✕
      </button>
    </form>
  );
}
