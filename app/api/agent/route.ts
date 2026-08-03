/**
 * POST /api/agent
 *
 * Repo-aware conversational agent endpoint returning structured assistant content
 * and interactive AgentActions (focusFiles, showFunction, openDocsPage, suggestQuestions).
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
  actions?: AgentAction[];
}

export interface AgentAction {
  label: string;
  payload: {
    type: "focusFiles" | "showFunction" | "openDocsPage" | "suggestQuestions";
    data: any;
  };
}

export interface AgentRequest {
  repoUrl?: string;
  messages?: AgentChatMessage[];
}

export interface AgentResponse {
  content: string;
  actions?: AgentAction[];
}

export const AGENT_SYSTEM_PROMPT = `You are a codebase navigator agent. You help developers understand a specific GitHub repository.
You are given the repo URL, a summary of its structure, and a conversation. Answer clearly and concisely.

When relevant, suggest 1–3 interactive UI actions in the actions array to help the developer explore the repo.
Supported action types:
1. focusFiles: { label: "Focus auth files", payload: { type: "focusFiles", data: { files: ["lib/auth.ts"] } } }
2. showFunction: { label: "Show parseArgs function", payload: { type: "showFunction", data: { functionName: "parseArgs" } } }
3. openDocsPage: { label: "Open Overview docs", payload: { type: "openDocsPage", data: { slug: "overview" } } }
4. suggestQuestions: { label: "Follow-up questions", payload: { type: "suggestQuestions", data: { questions: ["How does option parsing work?", "Where is CLI defined?"] } } }

Return a JSON object with keys:
- content: (string answer grounded in the repo context)
- actions: (array of action objects, or empty array [])

Do NOT include markdown formatting or backticks around the JSON. Return ONLY raw JSON.`;

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

/**
 * Robustly parses LLM JSON string response.
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

    return {
      content: typeof parsed.content === "string" ? parsed.content : rawText,
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
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

    const sampleActions: AgentAction[] = [
      {
        label: "📖 Open Overview docs",
        payload: { type: "openDocsPage", data: { slug: "overview" } },
      },
      {
        label: "❓ Suggested questions",
        payload: {
          type: "suggestQuestions",
          data: { questions: ["What are the key modules?", "Where is CLI defined?"] },
        },
      },
    ];

    return Response.json({
      content: `[Agent Response] Answer to "${lastUserMessage}" based on repository structure.\n\n${contextSummary.slice(0, 250)}...`,
      actions: sampleActions,
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
      json.candidates?.[0]?.content?.parts?.[0]?.text ||
      '{"content": "I am unable to answer right now.", "actions": []}';

    const parsedResponse = parseAgentJsonResponse(rawText);

    return Response.json(parsedResponse satisfies AgentResponse);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return Response.json({ error: message }, { status: 500 });
  }
}
