"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/**
 * Landing page — prompts the user for a GitHub repo URL and navigates
 * to /repo/[encoded] on submit.
 */
export default function HomePage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Basic validation: don't allow empty input
    if (!repoUrl.trim()) {
      alert("Please enter a GitHub repository URL.");
      return;
    }

    // URL-encode the repo URL and navigate to the repo page
    const encoded = encodeURIComponent(repoUrl.trim());
    router.push(`/repo/${encoded}`);
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
      }}
    >
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
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            cursor: "pointer",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          Analyze
        </button>
      </form>
    </main>
  );
}
