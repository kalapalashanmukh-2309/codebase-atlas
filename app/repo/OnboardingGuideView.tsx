"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getOnboardingGuideForRepo,
  getGuideProgress,
  toggleStepProgress,
  deleteGuide,
  type OnboardingGuide,
  type OnboardingStep,
} from "@/lib/onboarding-guides";
import type { GraphMode } from "@/lib/graph-builder";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OnboardingGuideViewProps {
  repoUrl: string;
  refreshKey?: number;
  onApplyStepView: (graphMode: GraphMode, focusFiles: string[]) => void;
  onSelectQuestion: (question: string) => void;
  onCreateGuideClick: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingGuideView({
  repoUrl,
  refreshKey,
  onApplyStepView,
  onSelectQuestion,
  onCreateGuideClick,
}: OnboardingGuideViewProps) {
  const [guide, setGuide] = useState<OnboardingGuide | null>(null);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const load = useCallback(() => {
    const g = getOnboardingGuideForRepo(repoUrl);
    setGuide(g);
    if (g) {
      setCompletedStepIds(getGuideProgress(g.id));
    } else {
      setCompletedStepIds([]);
    }
  }, [repoUrl]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!guide) {
    return (
      <div
        style={{
          padding: "1.25rem",
          borderRadius: "10px",
          background: "rgba(15, 23, 42, 0.75)",
          border: "1px dashed rgba(56, 189, 248, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.3rem" }}>🗺️</span>
          <div>
            <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem" }}>
              No Onboarding Guide for this repository
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              Help new developers get up to speed by creating a curated list of steps & views.
            </div>
          </div>
        </div>

        <button
          onClick={onCreateGuideClick}
          style={{
            padding: "0.45rem 0.85rem",
            borderRadius: "6px",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            background: "rgba(56, 189, 248, 0.12)",
            color: "#38bdf8",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "ui-monospace, monospace",
            whiteSpace: "nowrap",
          }}
        >
          + Create Guide
        </button>
      </div>
    );
  }

  const totalSteps = guide.steps.length;
  const completedCount = completedStepIds.length;
  const percent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  function handleToggleStep(stepId: string) {
    if (!guide) return;
    const updated = toggleStepProgress(guide.id, stepId);
    setCompletedStepIds(updated);
  }

  function handleDeleteGuide() {
    if (!guide) return;
    if (confirm(`Delete the onboarding guide "${guide.name}"?`)) {
      deleteGuide(guide.id);
      load();
    }
  }

  function handleOpenStep(step: OnboardingStep) {
    setActiveStepId(step.id);
    onApplyStepView(step.graphMode, step.focusFiles || []);
  }

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
        gap: "1.25rem",
      }}
    >
      {/* Guide Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🗺️</span>
            <h2
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#f8fafc",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
              }}
            >
              {guide.name}
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={onCreateGuideClick}
              title="Edit / Replace Onboarding Guide"
              style={{
                padding: "0.3rem 0.6rem",
                borderRadius: "5px",
                border: "1px solid rgba(51, 65, 85, 0.6)",
                background: "transparent",
                color: "#94a3b8",
                fontSize: "0.75rem",
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              ⚙ Edit
            </button>
            <button
              onClick={handleDeleteGuide}
              title="Delete this Onboarding Guide"
              style={{
                padding: "0.3rem 0.5rem",
                borderRadius: "5px",
                border: "1px solid rgba(51, 65, 85, 0.6)",
                background: "transparent",
                color: "#64748b",
                fontSize: "0.75rem",
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              🗑
            </button>
          </div>
        </div>

        {/* Progress Bar & Counter */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.78rem",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <span style={{ color: "#94a3b8" }}>Onboarding Progress</span>
            <span
              style={{
                fontWeight: 600,
                color: percent === 100 ? "#34d399" : "#38bdf8",
              }}
            >
              {completedCount}/{totalSteps} steps completed ({percent}%)
            </span>
          </div>

          <div
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              background: "rgba(51, 65, 85, 0.5)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                height: "100%",
                background:
                  percent === 100
                    ? "linear-gradient(90deg, #34d399, #10b981)"
                    : "linear-gradient(90deg, #38bdf8, #0284c7)",
                borderRadius: "3px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {guide.steps.map((step, idx) => {
          const isDone = completedStepIds.includes(step.id);
          const isActive = activeStepId === step.id;

          return (
            <div
              key={step.id}
              style={{
                padding: "1rem",
                borderRadius: "10px",
                background: isActive
                  ? "rgba(56, 189, 248, 0.08)"
                  : "rgba(3, 7, 18, 0.7)",
                border: isActive
                  ? "1px solid rgba(56, 189, 248, 0.4)"
                  : isDone
                  ? "1px solid rgba(52, 211, 153, 0.3)"
                  : "1px solid rgba(51, 65, 85, 0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                transition: "border-color 0.2s, background 0.2s",
              }}
            >
              {/* Step Top Line: Checkbox + Title + Mode + Actions */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => handleToggleStep(step.id)}
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: "#34d399",
                      cursor: "pointer",
                    }}
                  />

                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#64748b",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    STEP {idx + 1}
                  </span>

                  <span
                    style={{
                      fontWeight: 600,
                      color: isDone ? "#94a3b8" : "#f1f5f9",
                      fontSize: "0.92rem",
                      fontFamily: "ui-monospace, monospace",
                      textDecoration: isDone ? "line-through" : "none",
                    }}
                  >
                    {step.title}
                  </span>

                  {/* Mode Badge */}
                  <span
                    style={{
                      fontSize: "0.65rem",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "3px",
                      fontWeight: 700,
                      fontFamily: "ui-monospace, monospace",
                      textTransform: "uppercase",
                      background:
                        step.graphMode === "detailed"
                          ? "rgba(52, 211, 153, 0.12)"
                          : "rgba(99, 102, 241, 0.12)",
                      color:
                        step.graphMode === "detailed" ? "#34d399" : "#818cf8",
                      border: `1px solid ${
                        step.graphMode === "detailed"
                          ? "rgba(52, 211, 153, 0.3)"
                          : "rgba(99, 102, 241, 0.3)"
                      }`,
                    }}
                  >
                    {step.graphMode}
                  </span>
                </div>

                {/* Open step button */}
                <button
                  onClick={() => handleOpenStep(step)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "5px",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    background: isActive ? "rgba(56, 189, 248, 0.25)" : "rgba(56, 189, 248, 0.1)",
                    color: "#38bdf8",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "ui-monospace, monospace",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isActive ? "✓ Active step" : "▶ Open this step"}
                </button>
              </div>

              {/* Step Description */}
              {step.description && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.82rem",
                    color: "#94a3b8",
                    lineHeight: 1.45,
                  }}
                >
                  {step.description}
                </p>
              )}

              {/* Focus Files Chips */}
              {step.focusFiles && step.focusFiles.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "ui-monospace, monospace" }}>
                    Files:
                  </span>
                  {step.focusFiles.map((file) => (
                    <span
                      key={file}
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        background: "rgba(15, 23, 42, 0.8)",
                        border: "1px solid rgba(56, 189, 248, 0.2)",
                        color: "#38bdf8",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {file}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Questions */}
              {step.suggestedQuestions && step.suggestedQuestions.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                    paddingTop: "0.4rem",
                    borderTop: "1px dashed rgba(51, 65, 85, 0.5)",
                  }}
                >
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#cbd5e1", fontFamily: "ui-monospace, monospace" }}>
                    💡 Suggested Questions:
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    {step.suggestedQuestions.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        onClick={() => onSelectQuestion(q)}
                        style={{
                          textAlign: "left",
                          padding: "0.4rem 0.65rem",
                          borderRadius: "5px",
                          background: "rgba(15, 23, 42, 0.8)",
                          border: "1px solid rgba(51, 65, 85, 0.6)",
                          color: "#38bdf8",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          fontFamily: "ui-monospace, monospace",
                          lineHeight: 1.4,
                          transition: "border-color 0.2s, background 0.2s",
                        }}
                        onMouseOver={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(56, 189, 248, 0.5)";
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(15, 23, 42, 1)";
                        }}
                        onMouseOut={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(51, 65, 85, 0.6)";
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(15, 23, 42, 0.8)";
                        }}
                      >
                        👉 {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
