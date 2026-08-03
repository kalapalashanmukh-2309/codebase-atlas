"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getOnboardingGuides,
  getMissionProgress,
  getGuideProgress,
  type OnboardingGuide,
} from "@/lib/onboarding-guides";
import { buildRepoUrl } from "@/lib/url-builder";
import { formatRepoName } from "@/lib/recent-analyses";

/**
 * /missions — Displays all onboarding missions across all repositories with completion progress and Continue actions.
 */
export default function MissionsPage() {
  const [guides, setGuides] = useState<OnboardingGuide[]>([]);

  useEffect(() => {
    setGuides(getOnboardingGuides());
  }, []);

  function handleContinue(repoUrl: string) {
    window.location.href = buildRepoUrl(repoUrl);
  }

  // Group guides by repoUrl
  const grouped = guides.reduce<Record<string, OnboardingGuide[]>>((acc, guide) => {
    if (!acc[guide.repoUrl]) {
      acc[guide.repoUrl] = [];
    }
    acc[guide.repoUrl].push(guide);
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
              color: "#38bdf8",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
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
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
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

      {/* Header section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.75rem",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #f8fafc 0%, #38bdf8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Active Onboarding Missions
        </h1>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem" }}>
          Track and continue your codebase onboarding walkthroughs across all repositories.
        </p>
      </div>

      {/* Empty state */}
      {repoUrls.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            borderRadius: "12px",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px dashed rgba(51, 65, 85, 0.6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "2.5rem" }}>🎯</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#e2e8f0" }}>
              No active onboarding missions found
            </h3>
            <p
              style={{
                margin: "0.4rem 0 0",
                fontSize: "0.9rem",
                color: "#94a3b8",
                maxWidth: "28rem",
              }}
            >
              Onboarding guides created for repositories will automatically appear here as interactive missions.
            </p>
          </div>
          <Link
            href="/"
            style={{
              marginTop: "0.5rem",
              padding: "0.55rem 1.2rem",
              borderRadius: "6px",
              background: "#38bdf8",
              color: "#0f172a",
              fontWeight: 600,
              fontSize: "0.88rem",
              textDecoration: "none",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            Explore a Repository
          </Link>
        </div>
      )}

      {/* Grouped by repoUrl */}
      {repoUrls.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {repoUrls.map((repoUrl) => {
            const repoGuides = grouped[repoUrl];
            const repoName = formatRepoName(repoUrl);

            return (
              <div
                key={repoUrl}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  background: "rgba(15, 23, 42, 0.8)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                }}
              >
                {/* Repo Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: "0.75rem",
                    borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.2rem" }}>📦</span>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#38bdf8",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {repoName}
                    </h2>
                  </div>

                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "0.78rem",
                      color: "#64748b",
                      textDecoration: "none",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    GitHub ↗
                  </a>
                </div>

                {/* Missions List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {repoGuides.map((guide) => {
                    const mission = getMissionProgress(repoUrl, guide.id);
                    const completedStepIds = mission
                      ? mission.completedSteps
                      : getGuideProgress(guide.id);
                    const totalSteps = guide.steps.length;
                    const completedCount = completedStepIds.length;
                    const percent =
                      totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
                    const lastOpened = mission?.lastOpenedAt;

                    return (
                      <div
                        key={guide.id}
                        style={{
                          padding: "1.1rem",
                          borderRadius: "10px",
                          background: "rgba(3, 7, 18, 0.75)",
                          border: "1px solid rgba(51, 65, 85, 0.5)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.85rem",
                        }}
                      >
                        {/* Top Line: Title + Continue Button */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "1rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.1rem" }}>🎯</span>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: "1rem",
                                fontWeight: 700,
                                color: "#f8fafc",
                                fontFamily: "ui-monospace, monospace",
                              }}
                            >
                              {guide.name}
                            </h3>
                          </div>

                          <button
                            onClick={() => handleContinue(repoUrl)}
                            style={{
                              padding: "0.45rem 0.95rem",
                              borderRadius: "6px",
                              border: "1px solid rgba(56, 189, 248, 0.4)",
                              background: "rgba(56, 189, 248, 0.15)",
                              color: "#38bdf8",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              fontFamily: "ui-monospace, monospace",
                              whiteSpace: "nowrap",
                              transition: "background 0.2s, border-color 0.2s",
                            }}
                            onMouseOver={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "rgba(56, 189, 248, 0.25)";
                            }}
                            onMouseOut={(e) => {
                              (e.currentTarget as HTMLButtonElement).style.background =
                                "rgba(56, 189, 248, 0.15)";
                            }}
                          >
                            Continue →
                          </button>
                        </div>

                        {/* Progress Bar & Status */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.78rem",
                              fontFamily: "ui-monospace, monospace",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <span style={{ color: "#94a3b8" }}>Progress</span>
                              {lastOpened && (
                                <span style={{ color: "#64748b", fontSize: "0.72rem" }}>
                                  • Last opened {new Date(lastOpened).toLocaleDateString()}
                                </span>
                              )}
                            </div>
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
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
