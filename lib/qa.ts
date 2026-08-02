/**
 * lib/qa.ts
 *
 * Generates an AI-powered answer to user questions about a repository
 * using the Gemini API with a structured, context-aware prompt.
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

/**
 * Rough character budget for the entire prompt.
 * ~4 chars ≈ 1 token, so 24 000 chars ≈ 6 000 tokens — well within limits
 * while leaving room for the model's response.
 */
const MAX_PROMPT_CHARS = 24_000;

/** Max characters per individual snippet (keeps any single file from dominating). */
const MAX_SNIPPET_CHARS = 3_000;

// ---------------------------------------------------------------------------
// System instruction (stays constant)
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION = `You are an assistant helping a developer understand a specific GitHub repository.
You are given the repository URL, a set of file paths, and selected file contents.
Answer the question ONLY using this context.
If something is not clear from the provided context, say so explicitly instead of guessing.

Answer style rules:
- Use 1–3 short paragraphs.
- Reference specific file paths (e.g. \`src/command.ts\`) and function/class names when relevant.
- If there are multiple possible interpretations, explain each and state which files support them.
- Avoid generic statements like "This repo is a library" unless the snippets explicitly confirm it.
- If very few relevant files were available as context, mention that the answer may be incomplete.`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Answer a user's question about a codebase based on graph context
 * and file snippets.
 */
export async function answerQuestion(
  input: AskQuestionInput,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return "GEMINI_API_KEY is not configured. Please add it to your environment variables to enable Q&A.";
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
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gemini Q&A API error (${res.status}):`, errText);
      return FALLBACK_ANSWER;
    }

    const data = (await res.json()) as GeminiResponse;

    if (data.error) {
      console.error("Gemini Q&A API error:", data.error.message);
      return FALLBACK_ANSWER;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || FALLBACK_ANSWER;
  } catch (err) {
    console.error("Failed to generate Q&A response:", err);
    return FALLBACK_ANSWER;
  }
}

// ---------------------------------------------------------------------------
// Prompt builder (user turn only — system instruction is sent separately)
// ---------------------------------------------------------------------------

function buildUserPrompt(input: AskQuestionInput): string {
  const { repoUrl, question, folders, files, snippets } = input;

  // ---- Header: repo URL + structure summary ----
  const topFolders =
    folders.length > 0
      ? folders.slice(0, 20).join(", ")
      : "(root level only)";

  let prompt = `## Repository
URL: ${repoUrl}
Top-level folders: ${topFolders}
Total TypeScript/TSX files: ${files.length}

`;

  // ---- File list (compact, so the model knows what exists) ----
  const fileListLimit = 40;
  const displayFiles = files.slice(0, fileListLimit);
  prompt += `## File paths (showing ${displayFiles.length} of ${files.length})\n`;
  prompt += displayFiles.map((f) => `- ${f}`).join("\n");
  if (files.length > fileListLimit) {
    prompt += `\n- … and ${files.length - fileListLimit} more`;
  }
  prompt += "\n\n";

  // ---- Snippets (token-capped) ----
  prompt += `## Relevant file contents (${snippets.length} files)\n\n`;

  if (snippets.length === 0) {
    prompt +=
      "(No file content could be retrieved. Answer based on file paths and structure only.)\n\n";
  } else {
    let totalChars = prompt.length;

    for (const s of snippets) {
      // Trim individual snippets to MAX_SNIPPET_CHARS
      const trimmed =
        s.content.length > MAX_SNIPPET_CHARS
          ? s.content.slice(0, MAX_SNIPPET_CHARS) + "\n...[truncated]"
          : s.content;

      const block = `### ${s.path}\n\`\`\`\n${trimmed}\n\`\`\`\n\n`;

      // Stop adding snippets if we'd exceed the overall prompt budget
      if (totalChars + block.length > MAX_PROMPT_CHARS) {
        prompt += `(Remaining snippets omitted to stay within context limits.)\n\n`;
        break;
      }

      prompt += block;
      totalChars += block.length;
    }
  }

  // ---- Question ----
  prompt += `## Question\n${question}\n`;

  return prompt;
}
