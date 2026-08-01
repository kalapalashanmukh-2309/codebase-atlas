/**
 * lib/qa.ts
 *
 * Generates an AI-powered answer to user questions about a repository
 * using the Gemini API.
 */

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

const FALLBACK_ANSWER =
  "Sorry, I couldn't generate an answer right now. Please verify your GEMINI_API_KEY or try again later.";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

/**
 * Answer a user's question about a codebase based on graph context and file snippets.
 */
export async function answerQuestion(input: AskQuestionInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return "GEMINI_API_KEY is not configured. Please add it to your environment variables to enable Q&A.";
  }

  const prompt = buildQaPrompt(input);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.2,
          },
        }),
      }
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

function buildQaPrompt(input: AskQuestionInput): string {
  const { repoUrl, question, folders, files, snippets } = input;

  const folderList =
    folders.length > 0 ? folders.join(", ") : "(root level only)";

  const sampleFileList = files
    .slice(0, 30)
    .map((f) => `  - ${f}`)
    .join("\n");

  const snippetBlock =
    snippets.length > 0
      ? snippets
          .map((s) => `--- File: ${s.path} ---\n${s.content}`)
          .join("\n\n")
      : "(No file content snippets retrieved)";

  return `You are an expert software developer assisting a developer in understanding a GitHub codebase.

Repository URL: ${repoUrl}

Top-level Folders: ${folderList}

Sample File Paths (${files.length} total TypeScript files):
${sampleFileList}

Relevant Code Snippets:
${snippetBlock}

User Question:
${question}

Instructions:
- Provide a clear, helpful, and accurate response based on the repository context and file snippets provided above.
- If the exact information isn't in the provided snippets or file structure, state what is known and what cannot be confirmed.
- Be direct and concise.`;
}
