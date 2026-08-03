"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getOnboardingGuides,
  getGuideProgress,
  deleteGuide,
  type OnboardingGuide,
} from "@/lib/onboarding-guides";
import { buildRepoUrl } from "@/lib/url-builder";
import { formatRepoName } from "@/lib/recent-analyses";

/**
 * /onboarding — Displays all onboarding guides across all repositories, grouped by repoUrl.
 */
export default function OnboardingGuidesPage() {
  const [guides, setGuides] = useState<OnboardingGuide[]>([]);
  const [deletedId, setDeletedId] = useState<string | null>(null);

  useEffect(() => {
    setGuides(getOnboardingGuides());
  }, []);

  function handleDelete(id: string) {
    setDeletedId(id);
    setTimeout(() => {
      deleteGuide(id);
      setDeletedId(null);
      setGuides(getOnboardingGuides());
    }, 300);
  }

  function handleOpen(repoUrl: string) {
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
            href="/onboarding"
            style={{
              color: "#38bdf8",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
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

      {/* Page Title */}
      <div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            margin: 0,
            color: "#f8fafc",
          }}
        >
          Onboarding Guides
        </h1>
        <p
          style={{
            color: "#94a3b8",
            marginTop: "0.5rem",
            fontSize: "0.95rem",
            lineHeight: 1.5,
          }}
        >
          Curated step-by-step walkthroughs, key file focus views, and questions for repository onboarding.
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
          <span style={{ fontSize: "2.5rem" }}>🗺️</span>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0, color: "#e2e8f0" }}>
            No Onboarding Guides Yet
          </h2>
          <p style={{ color: "#94a3b8", maxWidth: "28rem", margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>
            When viewing any repository graph, click the <strong>&quot;🗺️ Create guide&quot;</strong> button in the header to build interactive onboarding steps for your team.
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
            const repoGuides = grouped[repoUrl];
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
                {/* Repo Header */}
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
                      {repoGuides.length} guide{repoGuides.length > 1 ? "s" : ""}
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

                {/* Guide Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {repoGuides.map((guide) => {
                    const isDeleting = deletedId === guide.id;
                    const date = new Date(guide.createdAt);
                    const dateStr = date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    const completedProgress = getGuideProgress(guide.id);
                    const completedCount = completedProgress.length;
                    const totalSteps = guide.steps.length;

                    return (
                      <div
                        key={guide.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "1rem",
                          padding: "0.85rem 1.1rem",
                          borderRadius: "8px",
                          background: "rgba(3, 7, 18, 0.75)",
                          border: "1px solid rgba(51, 65, 85, 0.5)",
                          opacity: isDeleting ? 0.3 : 1,
                          transition: "opacity 0.3s, border-color 0.2s",
                        }}
                      >
                        {/* Left Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.6rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 700,
                                color: "#f1f5f9",
                                fontSize: "0.95rem",
                                fontFamily: "ui-monospace, monospace",
                              }}
                            >
                              {guide.name}
                            </span>

                            {/* Total Steps Badge */}
                            <span
                              style={{
                                fontSize: "0.68rem",
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                fontWeight: 600,
                                fontFamily: "ui-monospace, monospace",
                                background: "rgba(99, 102, 241, 0.12)",
                                color: "#818cf8",
                                border: "1px solid rgba(99, 102, 241, 0.3)",
                              }}
                            >
                              {totalSteps} step{totalSteps > 1 ? "s" : ""}
                            </span>

                            {/* Progress Badge */}
                            {completedCount > 0 && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  padding: "0.1rem 0.4rem",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  fontFamily: "ui-monospace, monospace",
                                  background:
                                    completedCount === totalSteps
                                      ? "rgba(52, 211, 153, 0.15)"
                                      : "rgba(56, 189, 248, 0.12)",
                                  color:
                                    completedCount === totalSteps
                                      ? "#34d399"
                                      : "#38bdf8",
                                  border: `1px solid ${
                                    completedCount === totalSteps
                                      ? "rgba(52, 211, 153, 0.35)"
                                      : "rgba(56, 189, 248, 0.3)"
                                  }`,
                                }}
                              >
                                {completedCount}/{totalSteps} done
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

                          {/* Step Titles preview */}
                          <div
                            style={{
                              marginTop: "0.4rem",
                              fontSize: "0.8rem",
                              color: "#94a3b8",
                              display: "flex",
                              gap: "0.4rem",
                              flexWrap: "wrap",
                            }}
                          >
                            {guide.steps.map((s, idx) => (
                              <span
                                key={s.id || idx}
                                style={{
                                  padding: "0.1rem 0.35rem",
                                  borderRadius: "3px",
                                  background: "rgba(15, 23, 42, 0.8)",
                                  border: "1px solid rgba(51, 65, 85, 0.4)",
                                  fontSize: "0.72rem",
                                  fontFamily: "ui-monospace, monospace",
                                }}
                              >
                                {idx + 1}. {s.title}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            flexShrink: 0,
                          }}
                        >
                          <button
                            onClick={() => handleOpen(guide.repoUrl)}
                            style={{
                              padding: "0.4rem 0.8rem",
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
                            ▶ Open Guide
                          </button>

                          <button
                            onClick={() => handleDelete(guide.id)}
                            title="Delete this onboarding guide"
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
