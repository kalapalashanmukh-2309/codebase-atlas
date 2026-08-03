/**
 * POST /api/agent
 *
 * Repo-aware conversational agent endpoint.
 * Loads repository structure, function counts, docs pages, and function index
 * to return grounded AI responses to user messages.
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

export interface AgentChatMessage {
  role: MessageRole;
  content: string;
}

export interface AgentRequest {
  repoUrl?: string;
  messages?: AgentChatMessage[];
}

export interface AgentResponse {
  content: string;
  actions?: any[];
}

export const AGENT_SYSTEM_PROMPT = `You are a codebase navigator agent. You help developers understand a specific GitHub repository. You are given the repo URL, a summary of its structure, and a conversation. Answer clearly and concisely. If you don't know something, say so.`;

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

  const topFuncs = (analysis.functionCounts?.allFunctions || [])
    .slice(0, 8)
    .map((f) => `${f.name} (${f.count} calls)`)
    .join(", ");

  const topHooks = (analysis.functionCounts?.hooks || [])
    .slice(0, 5)
    .map((h) => `${h.name} (${h.count} calls)`)
    .join(", ");

  const docSummaries = docsPages
    .map((d) => `"${d.slug}": ${d.title} (${d.summary.slice(0, 90)}...)`)
    .join("\n");

  const funcIndexSummary = Object.entries(analysis.functionIndex || {})
    .slice(0, 8)
    .map(
      ([name, detail]) =>
        `${name}: defined in ${detail.definitions[0]?.file || "unknown"}, ${detail.callCount} calls`
    )
    .join("\n");

  return `=== REPOSITORY ANALYSIS CONTEXT ===
Repository URL: ${repoUrl}
Total TypeScript/JavaScript Files: ${fileCount}
Key Modules / Folders: ${folders.join(", ") || "Root level"}
Sample Files: ${sampleFiles.join(", ")}
${topFuncs ? `Top Functions: ${topFuncs}` : ""}
${topHooks ? `Top React Hooks: ${topHooks}` : ""}
${docSummaries ? `Living Docs Pages:\n${docSummaries}` : ""}
${funcIndexSummary ? `Function Index Summary:\n${funcIndexSummary}` : ""}
===================================`;
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
  const apiKey = process.env.GEMINI_API_KEY;

  // 1. Fetch & compute repository analysis context
  let contextSummary = `Repository URL: ${repoUrl}`;
  try {
    const { owner, repo } = parseGitHubUrl(repoUrl);
    const tree = await fetchRepoTree(owner, repo);
    const analysis = buildAnalyzeResult(tree);

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

    let docsPages = getDocsPagesForRepo(repoUrl);
    if (docsPages.length === 0) {
      docsPages = [
        {
          id: `doc_overview_${repoUrl}`,
          repoUrl,
          slug: "overview",
          title: "Overview",
          summary: `High-level architectural overview of ${repoUrl}, highlighting key modules and core entry points.`,
          graphMode: "high-level",
          suggestedQuestions: [
            "What is the main purpose of this repo?",
            "Where are the main entry points located?",
            "How are core modules structured?",
          ],
          order: 0,
        },
      ];
    }

    contextSummary = buildAgentContextSummary(repoUrl, analysis, docsPages);
  } catch (err) {
    console.warn("[api/agent] Unable to fetch deep analysis context:", err);
  }

  if (!apiKey) {
    const lastUserMessage = recentMessages.filter((m) => m.role === "user").pop()?.content || "";
    return Response.json({
      content: `[Agent] Answer to "${lastUserMessage}" based on repository structure.\n\n${contextSummary.slice(0, 250)}...`,
      actions: [],
    } satisfies AgentResponse);
  }

  const contents = recentMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const systemInstruction = `${AGENT_SYSTEM_PROMPT}\n\n${contextSummary}`;

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
            maxOutputTokens: 1500,
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
      json.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I am unable to answer right now.";

    return Response.json({
      content: rawText,
      actions: [],
    } satisfies AgentResponse);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return Response.json({ error: message }, { status: 500 });
  }
}
