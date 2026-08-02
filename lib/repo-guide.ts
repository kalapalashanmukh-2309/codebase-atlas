/**
 * lib/repo-guide.ts
 *
 * Infers repository type from file structure heuristics and provides
 * tailored recommended questions for Q&A exploration.
 */

export type RepoType = "cli" | "react-app" | "express-api" | "other";

export interface RepoGuide {
  type: RepoType;
  label: string;
  recommendedQuestions: string[];
}

/**
 * Heuristic classifier that detects whether a project is a CLI library,
 * React web application, Express/Node API, or general TS/JS repo based
 * on file path conventions.
 */
export function detectRepoGuide(files: string[]): RepoGuide {
  let cliScore = 0;
  let reactScore = 0;
  let expressScore = 0;

  for (const file of files) {
    const lower = file.toLowerCase();

    // --- CLI Heuristics ---
    if (
      lower.includes("cli.") ||
      lower.includes("command.") ||
      lower.startsWith("bin/") ||
      lower.startsWith("commands/") ||
      lower.startsWith("cmd/") ||
      lower.includes("option") ||
      lower.includes("flags")
    ) {
      cliScore += 2;
    }

    // --- React App Heuristics ---
    if (
      lower.endsWith(".tsx") ||
      lower.endsWith(".jsx") ||
      lower.includes("components/") ||
      lower.includes("pages/") ||
      lower.includes("app/") ||
      lower.includes("hooks/")
    ) {
      reactScore += 1;
    }

    // --- Express / Node API Heuristics ---
    if (
      lower.includes("routes/") ||
      lower.includes("controllers/") ||
      lower.includes("middleware/") ||
      lower.includes("services/") ||
      lower.includes("models/") ||
      lower.endsWith("server.ts") ||
      lower.endsWith("server.js") ||
      lower.endsWith("app.ts") ||
      lower.endsWith("app.js")
    ) {
      expressScore += 2;
    }
  }

  // Determine highest scoring category
  let type: RepoType = "other";
  let maxScore = 0;

  if (cliScore > maxScore) {
    type = "cli";
    maxScore = cliScore;
  }

  if (reactScore > maxScore) {
    type = "react-app";
    maxScore = reactScore;
  }

  if (expressScore > maxScore) {
    type = "express-api";
    maxScore = expressScore;
  }

  // Return label & recommended questions
  switch (type) {
    case "cli":
      return {
        type: "cli",
        label: "CLI Tool / Library",
        recommendedQuestions: [
          "Where are commands defined?",
          "How are options parsed?",
          "What is the main entry point?",
        ],
      };

    case "react-app":
      return {
        type: "react-app",
        label: "React / Frontend App",
        recommendedQuestions: [
          "Where are the main components defined?",
          "How is routing handled?",
          "Where is global state managed?",
        ],
      };

    case "express-api":
      return {
        type: "express-api",
        label: "Node.js / Express API",
        recommendedQuestions: [
          "Where are routes defined?",
          "How is middleware organized?",
          "Where is the DB connection handled?",
        ],
      };

    default:
      return {
        type: "other",
        label: "JavaScript / TypeScript Repository",
        recommendedQuestions: [
          "What is the main entry point of this project?",
          "How is the project structured?",
          "Where are core utilities located?",
        ],
      };
  }
}
