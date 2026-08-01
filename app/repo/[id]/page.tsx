"use client";

import { use, useState } from "react";

/**
 * /repo/[id] — Repository detail page.
 *
 * The [id] segment is an encoded GitHub URL. We decode it here and display it.
 * Includes temporary "Test analyze" and "Ask" buttons that call the mock APIs.
 *
 * NOTE: This is a Client Component because it uses `use(params)` and
 *       interactive state (useState) for the API-test UI.
 */
export default function RepoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // In Next.js 16 client components, params is a Promise — unwrap with use()
  const { id } = use(params);

  // Decode the URL-encoded repo URL back to its original form
  const repoUrl = decodeURIComponent(id);

  // --- State for the Q&A test input ---
  const [question, setQuestion] = useState("");

  // --- Handler: call /api/analyze and log the result ---
  async function handleTestAnalyze() {
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      console.log("Analyze response:", data);
    } catch (err) {
      console.error("Analyze request failed:", err);
    }
  }

  // --- Handler: call /api/ask and log the result ---
  async function handleTestAsk() {
    if (!question.trim()) return;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, question }),
      });
      const data = await res.json();
      console.log("Ask response:", data);
    } catch (err) {
      console.error("Ask request failed:", err);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Repository</h1>

      <p style={{ marginTop: "0.5rem", wordBreak: "break-all" }}>{repoUrl}</p>

      <p style={{ marginTop: "1rem", color: "#666" }}>
        Overview, graph, onboarding, and Q&amp;A will go here.
      </p>

      {/* ---- Temporary API test controls ---- */}
      <hr style={{ margin: "2rem 0" }} />

      {/* Test /api/analyze */}
      <section>
        <button
          onClick={handleTestAnalyze}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          Test analyze
        </button>
        <p style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.25rem" }}>
          Check the browser console for the response.
        </p>
      </section>

      {/* Test /api/ask */}
      <section style={{ marginTop: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this repo…"
            style={{
              flex: 1,
              padding: "0.5rem",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
          <button
            onClick={handleTestAsk}
            style={{
              padding: "0.5rem 1rem",
              cursor: "pointer",
            }}
          >
            Ask
          </button>
        </div>
        <p style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.25rem" }}>
          Check the browser console for the response.
        </p>
      </section>
    </main>
  );
}
