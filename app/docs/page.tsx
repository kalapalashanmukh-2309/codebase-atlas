"use client";

import Link from "next/link";

/**
 * /docs — Documentation and About page for Codebase Atlas.
 */
export default function DocsPage() {
  const exampleRepos = [
    {
      name: "tj/commander.js",
      url: "https://github.com/tj/commander.js",
      desc: "Node.js command-line interface framework",
    },
    {
      name: "facebook/react",
      url: "https://github.com/facebook/react",
      desc: "UI library for building component-based interfaces",
    },
    {
      name: "expressjs/express",
      url: "https://github.com/expressjs/express",
      desc: "Fast, unopinionated web framework for Node.js",
    },
    {
      name: "axios/axios",
      url: "https://github.com/axios/axios",
      desc: "Promise-based HTTP client for browser and node.js",
    },
  ];

  const exampleQuestions = [
    "What is the main purpose of this library?",
    "Where does command parsing or request routing happen?",
    "How is configuration or environment setup handled?",
    "Where are the main components or entry points defined?",
    "What are the key modules and how do they relate to each other?",
  ];

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "2.5rem",
        padding: "3rem 2rem",
        maxWidth: "52rem",
        margin: "0 auto",
        color: "#f8fafc",
        lineHeight: 1.7,
      }}
    >
      {/* Top Nav / Back Link */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link
          href="/"
          style={{
            color: "#38bdf8",
            textDecoration: "none",
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
          ← Back to Home
        </Link>
        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Codebase Atlas Documentation</span>
      </nav>

      {/* Hero Title */}
      <header style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 700, margin: 0 }}>About Codebase Atlas</h1>
        <p style={{ color: "#94a3b8", fontSize: "1.1rem", margin: 0 }}>
          A developer tool designed to visually map and explain any public GitHub repository.
        </p>
      </header>

      {/* Section 1: What is this? */}
      <section
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#38bdf8", marginTop: 0, marginBottom: "0.75rem" }}>
          What is this?
        </h2>
        <p style={{ margin: 0, color: "#cbd5e1" }}>
          Codebase Atlas helps developers quickly understand unfamiliar GitHub repositories. It builds an interactive visual graph of the codebase structure, generates a concise AI overview of the project architecture, and allows you to ask technical Q&amp;A questions powered by targeted code context.
        </p>
      </section>

      {/* Section 2: How it works */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f8fafc", margin: 0 }}>
          How it works
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            color: "#cbd5e1",
          }}
        >
          <li>
            <strong>1. URL Input &amp; Tree Fetching:</strong> Enter any public GitHub repository URL. The backend fetches the repository layout in a single request via the GitHub Git Trees API.
          </li>
          <li>
            <strong>2. File &amp; Node Filtering:</strong> Analyzes TypeScript and JavaScript files (<code style={{ color: "#38bdf8" }}>.ts</code>, <code style={{ color: "#38bdf8" }}>.tsx</code>, <code style={{ color: "#38bdf8" }}>.js</code>, <code style={{ color: "#38bdf8" }}>.jsx</code>, <code style={{ color: "#38bdf8" }}>.mjs</code>, <code style={{ color: "#38bdf8" }}>.cjs</code>).
          </li>
          <li>
            <strong>3. Visual Graph &amp; High-Level Collapsing:</strong> Generates an interactive force-directed graph. High-level mode collapses deep files into folder nodes while preserving primary entry points (e.g. <code style={{ color: "#38bdf8" }}>index.ts</code>, <code style={{ color: "#38bdf8" }}>app.tsx</code>, <code style={{ color: "#38bdf8" }}>cli.ts</code>).
          </li>
          <li>
            <strong>4. Targeted Q&amp;A:</strong> Uses a domain-aware scoring algorithm to select the most relevant file content snippets and feeds them into Gemini AI for honest, codebase-grounded answers.
          </li>
        </ul>
      </section>

      {/* Section 2.5: Recommended Questions & Guided Tours */}
      <section
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#38bdf8", marginTop: 0, marginBottom: "0.75rem" }}>
          Recommended Questions &amp; Guided Tours
        </h2>
        <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.6 }}>
          Codebase Atlas automatically analyzes repository file conventions to detect the project type (such as CLI tools, React applications, or Express APIs). It then suggests tailored <strong>Recommended Questions</strong> so you can instantly explore key entry points and architectural patterns with a single click.
        </p>
        <p style={{ margin: 0, marginTop: "0.5rem", color: "#94a3b8", fontSize: "0.9rem", fontStyle: "italic" }}>
          Example: For a CLI library, you&rsquo;ll see starter questions like &ldquo;Where are commands defined?&rdquo; and &ldquo;How are options parsed?&rdquo;.
        </p>
      </section>

      {/* Section 3: Current limitations */}
      <section
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "8px",
          padding: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fbbf24", marginTop: 0, marginBottom: "0.75rem" }}>
          Current limitations
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            color: "#cbd5e1",
          }}
        >
          <li>Only public GitHub repositories are supported (private repos require authentication token setup).</li>
          <li>Source code analysis is currently optimized for TypeScript and JavaScript codebases.</li>
          <li>Large repositories (200+ files) are capped to representative file samples to ensure fast load times and clean graphs.</li>
          <li>Q&amp;A specializes in structural and architectural questions rather than runtime debugging or dynamic execution tracing.</li>
        </ul>
      </section>

      {/* Section 4: Example repos */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f8fafc", margin: 0 }}>
          Example Repositories to Try
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {exampleRepos.map((repo) => (
            <a
              key={repo.name}
              href={`/repo?url=${encodeURIComponent(repo.url)}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                padding: "1rem",
                borderRadius: "8px",
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#38bdf8",
                textDecoration: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}
            >
              <span>{repo.name} ↗</span>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 400 }}>
                {repo.desc}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Section 5: Example questions */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#f8fafc", margin: 0 }}>
          Example Questions for Q&amp;A
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            color: "#cbd5e1",
          }}
        >
          {exampleQuestions.map((q, i) => (
            <li key={i}>
              <em>&ldquo;{q}&rdquo;</em>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer link */}
      <footer
        style={{
          borderTop: "1px solid #334155",
          paddingTop: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.85rem",
          color: "#64748b",
        }}
      >
        <span>Codebase Atlas — Understand any GitHub repo in minutes</span>
        <Link href="/" style={{ color: "#38bdf8", textDecoration: "none" }}>
          Analyze a Repository →
        </Link>
      </footer>
    </main>
  );
}
