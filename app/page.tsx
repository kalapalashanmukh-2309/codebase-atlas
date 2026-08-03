"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getRecentAnalyses,
  addRecentAnalysis,
  formatRepoName,
  type RecentAnalysis,
} from "@/lib/recent-analyses";

/**
 * Landing page — prompts the user for a GitHub repo URL and navigates
 * to /repo?url=... on submit, showcasing recent analyses.
 */
export default function HomePage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [recents, setRecents] = useState<RecentAnalysis[]>([]);

  // Load recent analyses on mount (SSR safe)
  useEffect(() => {
    setRecents(getRecentAnalyses());
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Basic validation: don't allow empty input
    if (!repoUrl.trim()) {
      alert("Please enter a GitHub repository URL.");
      return;
    }

    const clean = repoUrl.trim();

    // Save to recent analyses
    addRecentAnalysis(clean);

    // Navigate to repo analysis page
    const encoded = encodeURIComponent(clean);
    router.push(`/repo?url=${encoded}`);
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        position: "relative",
      }}
    >
      {/* Top Navbar */}
      <nav
        style={{
          position: "absolute",
          top: "1.5rem",
          right: "2rem",
          display: "flex",
          gap: "1.5rem",
          alignItems: "center",
        }}
      >
        <Link
          href="/saved"
          style={{
            color: "#38bdf8",
            textDecoration: "none",
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
          📌 Saved Views
        </Link>
        <Link
          href="/docs"
          style={{
            color: "#94a3b8",
            textDecoration: "none",
            fontSize: "0.95rem",
            fontWeight: 500,
          }}
        >
          Docs / About →
        </Link>
      </nav>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, textAlign: "center" }}>
        Understand any GitHub codebase in minutes
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          marginTop: "2rem",
          display: "flex",
          gap: "0.5rem",
          width: "100%",
          maxWidth: "36rem",
        }}
      >
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            fontSize: "1rem",
            border: "1px solid #334155",
            borderRadius: "6px",
            background: "#1e293b",
            color: "#f8fafc",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            cursor: "pointer",
            borderRadius: "6px",
            border: "none",
            background: "#2563eb",
            color: "#ffffff",
            fontWeight: 600,
          }}
        >
          Analyze
        </button>
      </form>

      {/* Recent Analyses Section */}
      {recents.length > 0 && (
        <div
          style={{
            marginTop: "3rem",
            width: "100%",
            maxWidth: "36rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            Recent Analyses
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recents.map((item) => {
              const name = formatRepoName(item.repoUrl);
              const encoded = encodeURIComponent(item.repoUrl);
              return (
                <a
                  key={item.repoUrl}
                  href={`/repo?url=${encoded}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    borderRadius: "6px",
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "#38bdf8",
                    textDecoration: "none",
                    fontSize: "0.95rem",
                    fontWeight: 500,
                  }}
                >
                  <span>{name}</span>
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    {new Date(item.analyzedAt).toLocaleDateString()}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
