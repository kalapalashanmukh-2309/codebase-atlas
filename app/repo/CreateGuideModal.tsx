"use client";

import { useState, useEffect } from "react";
import { saveGuide, type OnboardingStep, type OnboardingGuide } from "@/lib/onboarding-guides";
import type { GraphMode } from "@/lib/graph-builder";

// ---------------------------------------------------------------------------
// Props & Types
// ---------------------------------------------------------------------------

interface CreateGuideModalProps {
  repoUrl: string;
  currentGraphMode: GraphMode;
  currentFocusFiles: string[];
  isOpen: boolean;
  onClose: () => void;
  onGuideSaved?: (guide: OnboardingGuide) => void;
}

interface StepDraft {
  tempId: string;
  title: string;
  description: string;
  graphMode: GraphMode;
  focusFilesText: string;
  questionsText: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateGuideModal({
  repoUrl,
  currentGraphMode,
  currentFocusFiles,
  isOpen,
  onClose,
  onGuideSaved,
}: CreateGuideModalProps) {
  const [guideName, setGuideName] = useState("First week in this repo");
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [saved, setSaved] = useState(false);

  // Initialize steps when modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      setSaved(false);
      setGuideName("First week in this repo");
      setSteps([
        {
          tempId: `step_init_${Date.now()}_1`,
          title: "Project Overview",
          description: "High-level architecture and key entry points.",
          graphMode: currentGraphMode,
          focusFilesText: currentFocusFiles.join(", "),
          questionsText:
            "What is the main entry point of this codebase?\nHow are core modules structured?",
        },
      ]);
    }
  }, [isOpen, currentGraphMode, currentFocusFiles]);

  if (!isOpen) return null;

  function handleAddStep() {
    setSteps((prev) => [
      ...prev,
      {
        tempId: `step_draft_${Date.now()}_${prev.length + 1}`,
        title: `Step ${prev.length + 1}`,
        description: "",
        graphMode: currentGraphMode,
        focusFilesText: currentFocusFiles.join(", "),
        questionsText: "",
      },
    ]);
  }

  function handleRemoveStep(tempId: string) {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((s) => s.tempId !== tempId));
  }

  function handleStepChange<K extends keyof StepDraft>(
    tempId: string,
    field: K,
    value: StepDraft[K]
  ) {
    setSteps((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guideName.trim()) return;

    const parsedSteps: Omit<OnboardingStep, "id">[] = steps.map((s) => {
      const focusFiles = s.focusFilesText
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const suggestedQuestions = s.questionsText
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean);

      return {
        title: s.title.trim() || "Untitled Step",
        description: s.description.trim() || undefined,
        graphMode: s.graphMode,
        focusFiles: focusFiles.length > 0 ? focusFiles : undefined,
        suggestedQuestions,
      };
    });

    const newGuide = saveGuide({
      repoUrl,
      name: guideName.trim(),
      steps: parsedSteps as OnboardingStep[],
    });

    setSaved(true);
    onGuideSaved?.(newGuide);

    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(3, 7, 18, 0.85)",
        backdropFilter: "blur(8px)",
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "40rem",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "14px",
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          boxShadow:
            "0 20px 50px rgba(0,0,0,0.7), 0 0 24px rgba(56, 189, 248, 0.12)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(3, 7, 18, 0.4)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🗺️</span>
            <h2
              style={{
                margin: 0,
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "#f8fafc",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Create Onboarding Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: "1.25rem",
              cursor: "pointer",
              padding: "0.2rem 0.5rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            padding: "1.5rem",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {/* Success Banner */}
          {saved && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                background: "rgba(52, 211, 153, 0.15)",
                border: "1px solid rgba(52, 211, 153, 0.4)",
                color: "#34d399",
                fontWeight: 600,
                fontSize: "0.9rem",
                fontFamily: "ui-monospace, monospace",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              ✓ Onboarding guide saved successfully!
            </div>
          )}

          {/* Guide Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#e2e8f0",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Guide Name *
            </label>
            <input
              type="text"
              required
              value={guideName}
              onChange={(e) => setGuideName(e.target.value)}
              placeholder="e.g. First week in this repo"
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: "6px",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                background: "rgba(3, 7, 18, 0.8)",
                color: "#f8fafc",
                fontSize: "0.9rem",
                outline: "none",
                fontFamily: "ui-monospace, monospace",
              }}
            />
          </div>

          {/* Steps Section Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "0.5rem",
              borderTop: "1px solid rgba(51, 65, 85, 0.4)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#e2e8f0",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Steps ({steps.length})
            </h3>
            <button
              type="button"
              onClick={handleAddStep}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid rgba(56, 189, 248, 0.35)",
                background: "rgba(56, 189, 248, 0.1)",
                color: "#38bdf8",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              + Add Step
            </button>
          </div>

          {/* Steps List */}
          {steps.map((step, idx) => (
            <div
              key={step.tempId}
              style={{
                padding: "1.1rem",
                borderRadius: "10px",
                background: "rgba(3, 7, 18, 0.7)",
                border: "1px solid rgba(51, 65, 85, 0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
              }}
            >
              {/* Step Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "#38bdf8",
                    fontFamily: "ui-monospace, monospace",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Step {idx + 1}
                </span>

                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(step.tempId)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#f87171",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    🗑 Remove
                  </button>
                )}
              </div>

              {/* Step Title & Mode */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Step Title *</label>
                  <input
                    type="text"
                    required
                    value={step.title}
                    onChange={(e) => handleStepChange(step.tempId, "title", e.target.value)}
                    placeholder="e.g. Auth flow or Routing engine"
                    style={{
                      padding: "0.45rem 0.65rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(51, 65, 85, 0.6)",
                      background: "rgba(15, 23, 42, 0.9)",
                      color: "#f8fafc",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Graph Mode</label>
                  <select
                    value={step.graphMode}
                    onChange={(e) =>
                      handleStepChange(step.tempId, "graphMode", e.target.value as GraphMode)
                    }
                    style={{
                      padding: "0.45rem 0.65rem",
                      borderRadius: "6px",
                      border: "1px solid rgba(51, 65, 85, 0.6)",
                      background: "rgba(15, 23, 42, 0.9)",
                      color: "#f8fafc",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  >
                    <option value="high-level">High-Level</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
              </div>

              {/* Step Description */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Description (optional)</label>
                <input
                  type="text"
                  value={step.description}
                  onChange={(e) => handleStepChange(step.tempId, "description", e.target.value)}
                  placeholder="Brief summary of what new devs should look for in this step"
                  style={{
                    padding: "0.45rem 0.65rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(51, 65, 85, 0.6)",
                    background: "rgba(15, 23, 42, 0.9)",
                    color: "#f8fafc",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>

              {/* Focus Files */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Focus Files (comma-separated)
                </label>
                <input
                  type="text"
                  value={step.focusFilesText}
                  onChange={(e) => handleStepChange(step.tempId, "focusFilesText", e.target.value)}
                  placeholder="e.g. index.ts, lib/auth.ts"
                  style={{
                    padding: "0.45rem 0.65rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(51, 65, 85, 0.6)",
                    background: "rgba(15, 23, 42, 0.9)",
                    color: "#38bdf8",
                    fontSize: "0.82rem",
                    fontFamily: "ui-monospace, monospace",
                    outline: "none",
                  }}
                />
              </div>

              {/* Suggested Questions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                  Suggested Questions (one per line, 2–4 recommended)
                </label>
                <textarea
                  rows={3}
                  value={step.questionsText}
                  onChange={(e) => handleStepChange(step.tempId, "questionsText", e.target.value)}
                  placeholder="Where does authentication tokens get parsed?&#10;What happens on session expiry?"
                  style={{
                    padding: "0.5rem 0.65rem",
                    borderRadius: "6px",
                    border: "1px solid rgba(51, 65, 85, 0.6)",
                    background: "rgba(15, 23, 42, 0.9)",
                    color: "#f8fafc",
                    fontSize: "0.82rem",
                    fontFamily: "ui-monospace, monospace",
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          ))}

          {/* Form Actions Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(51, 65, 85, 0.4)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "6px",
                border: "1px solid rgba(51, 65, 85, 0.6)",
                background: "transparent",
                color: "#94a3b8",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saved || !guideName.trim()}
              style={{
                padding: "0.55rem 1.2rem",
                borderRadius: "6px",
                border: "1px solid rgba(52, 211, 153, 0.4)",
                background: "rgba(52, 211, 153, 0.2)",
                color: "#34d399",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              Save Guide
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
