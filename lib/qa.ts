/**
 * lib/qa.ts
 *
 * Generates an AI-powered answer to user questions about a repository
 * using the Gemini API with a structured, context-aware prompt.
 * Supports flow-question classification, focusFiles extraction, and flow summaries.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Snippet {
  path: string;
  content: string;
}

export interface AskQuestionInput {
  repoUrl: string;
  question: string;
  folders: string[];
  files: string[];
  snippets: Snippet[];
}

export interface QaResult {
  answer: string;
  referencedFiles: string[];
  focusFiles?: string[];
  summary?: string;
  isFlowQuestion?: boolean;
}

interface GeminiCandidate {
  content: { parts: { text: string }[] };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_ANSWER =
  "Sorry, I couldn't generate an answer right now. Please verify your GEMINI_API_KEY or try again later.";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

const MAX_PROMPT_CHARS = 24_000;
const MAX_SNIPPET_CHARS = 3_000;

// ---------------------------------------------------------------------------
// Flow Classification Helper
// ---------------------------------------------------------------------------

const FLOW_KEYWORDS = [
  "flow",
  "how does",
  "how do",
  "how work",
  "how works",
  "where is",
  "where are",
  "where handled",
  "workflow",
  "pipeline",
  "process",
  "step",
  "execution",
  "sequence",
  "lifecycle",
  "trace",
  "architecture",
];

/**
 * Detects if a user question is asking about execution flow, workflow, or component handling.
 */
export function isFlowQuestion(question: string): boolean {
  const lower = question.toLowerCase();
  return FLOW_KEYWORDS.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// System instruction
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION = `You are an assistant helping a developer understand a specific GitHub repository.
You are given the repository URL, a set of file paths, and selected file contents.
Answer the question ONLY using this context.
If something is not clear from the provided context, say so explicitly instead of guessing.

Answer style rules:
- Use 1–3 short paragraphs for your main explanation.
- Reference specific file paths (e.g. \`lib/parse.ts\`) and function/class names when relevant.
- At the very end of your response, output a JSON block like:
\`\`\`json
{
  "summary": "2-4 sentence overview explaining how this flow works",
  "focusFiles": ["lib/parse.ts", "commands/parse.ts"],
  "referencedFiles": ["lib/parse.ts", "commands/parse.ts"]
}
\`\`\`

JSON fields:
- "summary": A 2-4 sentence explanation of the workflow or architecture asked about.
- "focusFiles": The 2-6 most critical file paths involved in this execution flow.
- "referencedFiles": All file paths mentioned anywhere in your answer.`;

// ---------------------------------------------------------------------------
// Helper: Parse text answer & JSON block
// ---------------------------------------------------------------------------

export function parseQaResponse(rawText: string, question = ""): QaResult {
  if (!rawText) {
    return { answer: FALLBACK_ANSWER, referencedFiles: [], isFlowQuestion: false };
  }

  let text = rawText;
  let referencedFiles: string[] = [];
  let focusFiles: string[] = [];
  let summary: string | undefined;

  const isFlow = isFlowQuestion(question);

  // Match JSON block at end of response ```json { ... } ```
  const jsonBlockRegex = /```(?:json)?\s*\n?\s*(\{[\s\S]*?"referencedFiles"[\s\S]*?\})\s*\n?```/i;
  const match = rawText.match(jsonBlockRegex);

  if (match) {
    try {
      const parsed = JSON.parse(match[1]);

      if (Array.isArray(parsed.referencedFiles)) {
        referencedFiles = parsed.referencedFiles.filter(
          (f: unknown): f is string => typeof f === "string" && f.trim().length > 0
        );
      }

      if (Array.isArray(parsed.focusFiles)) {
        focusFiles = parsed.focusFiles.filter(
          (f: unknown): f is string => typeof f === "string" && f.trim().length > 0
        );
      }

      if (typeof parsed.summary === "string" && parsed.summary.trim().length > 0) {
        summary = parsed.summary.trim();
      }
    } catch {
      // ignore parse failure
    }
    text = rawText.replace(jsonBlockRegex, "").trim();
  } else {
    // Fallback regex for unformatted JSON `{ ... }` at end
    const fallbackMatch = rawText.match(/(\{[\s\S]*?"referencedFiles"[\s\S]*?\})/i);
    if (fallbackMatch) {
      try {
        const parsed = JSON.parse(fallbackMatch[1]);
        if (Array.isArray(parsed.referencedFiles)) {
          referencedFiles = parsed.referencedFiles.filter(
            (f: unknown): f is string => typeof f === "string" && f.trim().length > 0
          );
        }
        if (Array.isArray(parsed.focusFiles)) {
          focusFiles = parsed.focusFiles.filter(
            (f: unknown): f is string => typeof f === "string" && f.trim().length > 0
          );
        }
        if (typeof parsed.summary === "string" && parsed.summary.trim().length > 0) {
          summary = parsed.summary.trim();
        }
      } catch {
        // ignore
      }
      text = rawText.replace(fallbackMatch[0], "").trim();
    }
  }

  // Fallback: if focusFiles is empty, use referencedFiles
  if (focusFiles.length === 0) {
    focusFiles = [...referencedFiles];
  }

  return {
    answer: text,
    referencedFiles,
    focusFiles,
    summary,
    isFlowQuestion: isFlow,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Answer a user's question about a codebase based on graph context
 * and file snippets. Returns structured answer text, referenced file paths,
 * and flow focus metadata.
 */
export async function answerQuestion(
  input: AskQuestionInput
): Promise<QaResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      answer: "GEMINI_API_KEY is not configured. Please add it to your environment variables to enable Q&A.",
      referencedFiles: [],
      focusFiles: [],
      isFlowQuestion: false,
    };
  }

  const userPrompt = buildUserPrompt(input);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gemini Q&A API error (${res.status}):`, errText);
      return { answer: FALLBACK_ANSWER, referencedFiles: [], focusFiles: [], isFlowQuestion: false };
    }

    const data = (await res.json()) as GeminiResponse;

    if (data.error) {
      console.error("Gemini Q&A API error:", data.error.message);
      return { answer: FALLBACK_ANSWER, referencedFiles: [], focusFiles: [], isFlowQuestion: false };
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return parseQaResponse(rawText, input.question);
  } catch (err) {
    console.error("Failed to generate Q&A response:", err);
    return { answer: FALLBACK_ANSWER, referencedFiles: [], focusFiles: [], isFlowQuestion: false };
  }
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildUserPrompt(input: AskQuestionInput): string {
  const { repoUrl, question, folders, files, snippets } = input;

  const topFolders =
    folders.length > 0
      ? folders.slice(0, 20).join(", ")
      : "(root level only)";

  let prompt = `## Repository
URL: ${repoUrl}
Top-level folders: ${topFolders}
Total source files (TS/JS): ${files.length}

`;

  const fileListLimit = 40;
  const displayFiles = files.slice(0, fileListLimit);
  prompt += `## File paths (showing ${displayFiles.length} of ${files.length})\n`;
  prompt += displayFiles.map((f) => `- ${f}`).join("\n");
  if (files.length > fileListLimit) {
    prompt += `\n- … and ${files.length - fileListLimit} more`;
  }
  prompt += "\n\n";

  prompt += `## Relevant file contents (${snippets.length} files)\n\n`;

  if (snippets.length === 0) {
    prompt +=
      "(No file content could be retrieved. Answer based on file paths and structure only.)\n\n";
  } else {
    let totalChars = prompt.length;

    for (const s of snippets) {
      const trimmed =
        s.content.length > MAX_SNIPPET_CHARS
          ? s.content.slice(0, MAX_SNIPPET_CHARS) + "\n...[truncated]"
          : s.content;

      const block = `### ${s.path}\n\`\`\`\n${trimmed}\n\`\`\`\n\n`;

      if (totalChars + block.length > MAX_PROMPT_CHARS) {
        prompt += `(Remaining snippets omitted to stay within context limits.)\n\n`;
        break;
      }

      prompt += block;
      totalChars += block.length;
    }
  }

  prompt += `## Question\n${question}\n`;

  return prompt;
}
