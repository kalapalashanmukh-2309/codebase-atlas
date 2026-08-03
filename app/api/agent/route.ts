/**
 * POST /api/agent
 *
 * Repo-aware conversational agent endpoint.
 * Supports standard navigation queries, "Plan a Change" mode, "Explain this PR" mode,
 * and "Agent-Driven Guided Tour" mode returning structured Tour workflows.
 */

import {
  parseGitHubUrl,
  fetchRepoTree,
  buildAnalyzeResult,
  fetchFileContent,
  type AnalyzeResult,
} from "@/lib/github";
import { countFunctionCalls } from "@/lib/ast-counts";
import { buildFunctionIndexRecord } from "@/lib/ast-intel";
import { getDocsPagesForRepo, type DocsPage } from "@/lib/docs-pages";

const GEMINI_MODEL = "gemini-2.5-flash";

export type MessageRole = "user" | "assistant";

export interface ChangePlanStep {
  title: string;
  description: string;
  files: string[];
}

export interface ChangePlan {
  summary: string;
  steps: ChangePlanStep[];
  risks: string[];
}

export interface PRExplanation {
  summary: string;
  affectedModules: string[];
  keyChanges: string[];
  risks: string[];
}

export interface TourStep {
  title: string;
  summary: string;
  focusFiles?: string[];
  docsSlug?: string;
  suggestedQuestions: string[];
}

export interface Tour {
  steps: TourStep[];
}

export interface AgentAction {
  label: string;
  payload: {
    type: "focusFiles" | "showFunction" | "openDocsPage" | "suggestQuestions" | "focusStepFiles" | "openFile" | "startTour";
    data: any;
  };
}

export interface AgentChatMessage {
  role: MessageRole;
  content: string;
  actions?: AgentAction[];
  changePlan?: ChangePlan;
  prExplanation?: PRExplanation;
  tour?: Tour;
}

export interface AgentRequest {
  repoUrl?: string;
  messages?: AgentChatMessage[];
}

export interface AgentResponse {
  content: string;
  actions?: AgentAction[];
  changePlan?: ChangePlan;
  prExplanation?: PRExplanation;
  tour?: Tour;
}

export const AGENT_SYSTEM_PROMPT = `You are a codebase navigator agent.
Your job is to help developers understand a specific repository quickly.

Guidelines:
1. Be concise: Keep responses within 1–3 short paragraphs unless the user asks for more detail.
2. Be action-oriented: Always try to suggest 1–3 concrete next actions (files to focus/open, docs to read, functions to inspect).
3. Be honest & grounded: Use the provided repository analysis context as ground truth. If you don't know something based on the context, say so clearly instead of guessing.
4. Be specific: Prefer referring to exact file paths and function names when possible.

Return a JSON object with keys:
- content: (string answer)
- actions: (array of 1–3 action objects, or empty array [])

Do NOT include markdown formatting or backticks around the JSON. Return ONLY raw JSON.`;

export const CHANGE_PLANNER_PROMPT = `You are an expert change planning assistant for software repositories.
You are given the repository context and a desired change or feature request from a developer.
Provide a clear, actionable, step-by-step implementation plan.

Return a JSON object with:
- summary: 2–4 sentences describing what this change accomplishes at a high level.
- steps: array of step objects, each with:
    - title: short step title (e.g. "Create rate limiter middleware")
    - description: clear implementation guidance
    - files: array of affected file paths (e.g. ["lib/command.js", "lib/option.js"])
- risks: array of strings (potential risks, breaking changes, or reviewer considerations)
- content: concise overview text summarizing the plan

Do NOT include markdown formatting or backticks around the JSON. Return ONLY raw JSON.`;

export const PR_EXPLAINER_PROMPT = `You are an expert principal software engineer reviewing code diffs and pull requests.
You are given the repository context and a unified diff or PR description.

Return a JSON object with:
- summary: 2–4 sentences describing what this PR does at a high level.
- affectedModules: array of affected file paths or modules (e.g. ["lib/command.js", "lib/option.js"])
- keyChanges: array of 3–6 bullet points describing the main changes
- risks: array of 2–4 bullet points describing potential risks or reviewer notes
- content: concise overview text summarizing the PR review

Do NOT include markdown formatting or backticks around the JSON. Return ONLY raw JSON.`;

/**
 * Detects whether a user message requests a guided tour.
 */
function isGuidedTourIntent(userText: string): boolean {
  const lower = userText.toLowerCase().trim();
  return lower.includes("guided tour") || lower.includes("start tour") || lower === "/tour";
}

/**
 * Detects whether a user message expresses intent to plan a code change.
 */
function isChangePlanIntent(userText: string): boolean {
  const lower = userText.toLowerCase().trim();
  const patterns = [
    "i want to",
    "help me implement",
    "plan how to",
    "how to add",
    "plan a change",
    "how can i add",
    "create a plan",
  ];
  return patterns.some((p) => lower.includes(p));
}

/**
 * Detects whether a user message expresses intent to review/explain a PR or diff.
 */
function isPRExplainIntent(userText: string): boolean {
  const lower = userText.toLowerCase().trim();
  const patterns = [
    "explain this pr",
    "explain pr",
    "review this pr",
    "what does this diff do",
    "explain diff",
    "here's a diff",
    "diff --git",
    "--- a/",
    "+++ b/",
  ];
  return patterns.some((p) => lower.includes(p));
}

/**
 * Generates an initial agent-driven guided tour derived from repo files and docs pages.
 */
function deriveGuidedTour(repoUrl: string, files: string[], docsPages: DocsPage[]): Tour {
  const sampleFiles = files.slice(0, 15);
  const coreFiles = sampleFiles.filter((f) => !f.includes("test") && !f.includes("spec"));
  const primaryFiles = coreFiles.length > 0 ? coreFiles : files.slice(0, 5);

  const steps: TourStep[] = [
    {
      title: "1. Repository Overview & Entry Points",
      summary: `Welcome to the guided tour of ${repoUrl}. This step covers the high-level architecture, primary entry points, and directory layout.`,
      focusFiles: primaryFiles.slice(0, 3),
      docsSlug: "overview",
      suggestedQuestions: [
        "What is the main purpose of this repo?",
        "Where are the core entry points located?",
      ],
    },
    {
      title: "2. Core Logic & Main Modules",
      summary: "Explore the core execution pipeline, key function definitions, and primary business logic files.",
      focusFiles: primaryFiles.slice(1, 5),
      docsSlug: docsPages[1]?.slug || "overview",
      suggestedQuestions: [
        "How do core modules interact with each other?",
        "What are the most used functions in this codebase?",
      ],
    },
    {
      title: "3. API Routes, Services & Integration",
      summary: "Understand how requests, external integrations, or CLI commands are processed across sub-modules.",
      focusFiles: primaryFiles.slice(2, 6),
      docsSlug: docsPages[2]?.slug || "overview",
      suggestedQuestions: [
        "Where are external requests or CLI commands handled?",
        "How is error handling structured?",
      ],
    },
    {
      title: "4. Tests, Utilities & Architecture Wrap-Up",
      summary: "Conclude the tour by reviewing utility helpers, unit test suites, and overall architectural patterns.",
      focusFiles: files.filter((f) => f.includes("test") || f.includes("util")).slice(0, 4),
      docsSlug: "overview",
      suggestedQuestions: [
        "How are unit tests structured?",
        "What edge cases should reviewers watch out for?",
      ],
    },
  ];

  return { steps };
}

/**
 * Builds a compact, factual repository context summary string.
 */
function buildAgentContextSummary(
  repoUrl: string,
  analysis: AnalyzeResult,
  docsPages: DocsPage[]
): string {
  const fileCount = analysis.files.length;
  const sampleFiles = analysis.files.slice(0, 20);
  const folders = Array.from(
    new Set(analysis.files.map((f) => f.split("/")[0]).filter(Boolean))
  );

  const langSummary = (analysis.detectedLanguages || [])
    .map((l) => `${l.language} (${l.confidence} confidence: ${l.reason})`)
    .join("; ") || "TypeScript/JavaScript";

  const topFuncs = (analysis.functionCounts?.allFunctions || [])
    .slice(0, 8)
    .map((f) => `${f.name} (${f.count} calls)`)
    .join(", ");

  const funcIndexSummary = Object.entries(analysis.functionIndex || {})
    .slice(0, 8)
    .map(
      ([name, detail]) =>
        `${name}: defined in ${detail.definitions[0]?.file || "unknown"}, ${detail.callCount} calls`
    )
    .join("\n");

  return `=== REPOSITORY ANALYSIS CONTEXT ===
Repository URL: ${repoUrl}
Detected Repo Languages: ${langSummary}
Note: Language plugins provide AST function-level intelligence. Files without a matching language plugin are included in the file tree without function details.
Total Analyzed Files: ${fileCount}
Key Modules / Folders: ${folders.join(", ") || "Root level"}
Sample Files: ${sampleFiles.join(", ")}
${topFuncs ? `Top Functions: ${topFuncs}` : ""}
${funcIndexSummary ? `Function Index Summary:\n${funcIndexSummary}` : ""}
===================================`;
}

/**
 * Robustly parses LLM JSON response string.
 */
function parseAgentJsonResponse(rawText: string): AgentResponse {
  try {
    let cleanText = rawText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.slice(0, -3);
    }

    const parsed = JSON.parse(cleanText.trim());

    const isPR = parsed.affectedModules && Array.isArray(parsed.affectedModules);
    const isPlan = parsed.steps && Array.isArray(parsed.steps) && !parsed.steps[0]?.summary;
    const isTour = parsed.steps && Array.isArray(parsed.steps) && parsed.steps[0]?.summary;

    return {
      content: typeof parsed.content === "string" ? parsed.content : typeof parsed.summary === "string" ? parsed.summary : rawText,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      changePlan: isPlan ? (parsed as ChangePlan) : undefined,
      prExplanation: isPR ? (parsed as PRExplanation) : undefined,
      tour: isTour ? (parsed as Tour) : undefined,
    };
  } catch {
    return {
      content: rawText,
      actions: [],
    };
  }
}

export async function POST(request: Request) {
  let body: AgentRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const { repoUrl, messages = [] } = body;

  if (!repoUrl) {
    return Response.json(
      { error: "repoUrl parameter is required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "messages array must contain at least one message." },
      { status: 400 }
    );
  }

  const recentMessages = messages.slice(-10);
  const lastUserMessage = recentMessages.filter((m) => m.role === "user").pop()?.content || "";
  const isTourMode = isGuidedTourIntent(lastUserMessage);
  const isPRMode = !isTourMode && isPRExplainIntent(lastUserMessage);
  const isPlanningMode = !isTourMode && !isPRMode && isChangePlanIntent(lastUserMessage);
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Fetch & compute repository analysis context
  let contextSummary = `Repository URL: ${repoUrl}`;
  let analysisFiles: string[] = [];
  let docsPages: DocsPage[] = [];

  try {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    const tree = await fetchRepoTree(owner, repo);
    const analysis = buildAnalyzeResult(tree);
    analysisFiles = analysis.files;

    const sampleFiles = analysis.files.slice(0, 15);
    const snippetPromises = sampleFiles.map(async (filePath) => {
      const content = await fetchFileContent(owner, repo, filePath, 3000);
      return content ? { path: filePath, content } : null;
    });

    const snippetResults = await Promise.all(snippetPromises);
    const fetchedFiles = snippetResults.filter(
      (s): s is { path: string; content: string } => s !== null
    );

    if (fetchedFiles.length > 0) {
      analysis.functionCounts = countFunctionCalls(fetchedFiles);
      analysis.functionIndex = buildFunctionIndexRecord(fetchedFiles);
    }

    docsPages = getDocsPagesForRepo(repoUrl);
    contextSummary = buildAgentContextSummary(repoUrl, analysis, docsPages);
  } catch (err) {
    console.warn("[api/agent] Unable to fetch deep analysis context:", err);
  }

  // Handle Guided Tour request immediately
  if (isTourMode) {
    const tour = deriveGuidedTour(repoUrl, analysisFiles, docsPages);
    return Response.json({
      content: `Welcome to the Agent-Driven Guided Tour of ${repoUrl}! Click through the steps below to explore key modules, docs, and focus files step by step.`,
      tour,
      actions: [],
    } satisfies AgentResponse);
  }

  // 2. Offline fallback handling if no API key is configured
  if (!apiKey) {
    if (isPRMode) {
      const fileMatches = Array.from(
        lastUserMessage.matchAll(/(?:---|\+\+\+)\s+[ab]\/(.+)/g)
      ).map((m) => m[1]);
      const affectedModules = Array.from(new Set(fileMatches));

      const samplePRExplanation: PRExplanation = {
        summary: `Explanation for PR / diff patch in ${repoUrl}. (Offline Mode)`,
        affectedModules: affectedModules.length > 0 ? affectedModules : ["lib/command.js"],
        keyChanges: [
          "Updated core function signatures and parameter checks.",
          "Refactored execution pipeline and edge condition validation.",
        ],
        risks: [
          "Ensure unit test suite runs to verify no regression.",
          "GEMINI_API_KEY is not configured for full dynamic AI PR review.",
        ],
      };

      return Response.json({
        content: samplePRExplanation.summary,
        prExplanation: samplePRExplanation,
        actions: [],
      } satisfies AgentResponse);
    }

    if (isPlanningMode) {
      const samplePlan: ChangePlan = {
        summary: `Implementation plan for "${lastUserMessage}" across repository files. (Offline Mode)`,
        steps: [
          {
            title: "1. Update core service module",
            description: "Modify entry handler logic to support new request pipeline.",
            files: ["lib/command.js", "lib/option.js"],
          },
          {
            title: "2. Add middleware / validation guard",
            description: "Enforce validation parameters and error handling bounds.",
            files: ["lib/argument.js"],
          },
        ],
        risks: [
          "Ensure unit tests in tests/ are updated to cover new execution paths.",
          "GEMINI_API_KEY is not configured for full dynamic AI planning.",
        ],
      };

      return Response.json({
        content: samplePlan.summary,
        changePlan: samplePlan,
        actions: [],
      } satisfies AgentResponse);
    }

    return Response.json({
      content: `[Agent Response] Answer to "${lastUserMessage}" based on repository structure.\n\n${contextSummary.slice(0, 250)}...`,
      actions: [],
    } satisfies AgentResponse);
  }

  // 3. Call Gemini LLM with intent-specific prompt
  const activeSystemPrompt = isPRMode
    ? PR_EXPLAINER_PROMPT
    : isPlanningMode
    ? CHANGE_PLANNER_PROMPT
    : AGENT_SYSTEM_PROMPT;

  const contents = recentMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const systemInstruction = `${activeSystemPrompt}\n\n${contextSummary}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2000,
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const rawText =
      json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    const parsedResponse = parseAgentJsonResponse(rawText);

    return Response.json(parsedResponse satisfies AgentResponse);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return Response.json({ error: message }, { status: 500 });
  }
}
