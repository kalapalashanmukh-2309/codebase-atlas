/**
 * lib/overview.ts
 *
 * Generates a short AI-powered overview of a GitHub repository
 * using the Gemini API (via native fetch, no SDK required).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The structured input we send to the LLM. */
export interface OverviewInput {
  repoUrl: string;
  /** Top-level folder names within the analysis scope. */
  folders: string[];
  /** A small sample of TypeScript file paths (≤20). */
  sampleFiles: string[];
}

// ---------------------------------------------------------------------------
// Gemini API types (minimal, just what we need)
// ---------------------------------------------------------------------------

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

const FALLBACK_OVERVIEW =
  "Could not generate an AI overview. The repository contains TypeScript source files — explore the graph below for structure.";

const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a ≤150-word plain-English overview of a repository.
 *
 * Uses a single Gemini API call. If the call fails for any reason
 * (missing key, network error, rate limit), returns a static fallback.
 *
 * @param input.repoUrl    - Full GitHub URL
 * @param input.folders    - Top-level folder names in scope
 * @param input.sampleFiles - Up to 20 representative TS file paths
 */
export async function generateOverview(input: OverviewInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn(
      "GEMINI_API_KEY is not set — returning fallback overview. " +
        "Add it to .env.local to enable AI overviews."
    );
    return FALLBACK_OVERVIEW;
  }

  const prompt = buildPrompt(input);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            // Keep the response short and focused
            maxOutputTokens: 300,
            temperature: 0.3,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gemini API error (${res.status}):`, errText);
      return FALLBACK_OVERVIEW;
    }

    const data = (await res.json()) as GeminiResponse;

    if (data.error) {
      console.error("Gemini API returned error:", data.error.message);
      return FALLBACK_OVERVIEW;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || FALLBACK_OVERVIEW;
  } catch (err) {
    console.error("Failed to call Gemini API:", err);
    return FALLBACK_OVERVIEW;
  }
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildPrompt(input: OverviewInput): string {
  const { repoUrl, folders, sampleFiles } = input;

  const folderList =
    folders.length > 0
      ? folders.join(", ")
      : "(no sub-folders — files are at the root)";

  const fileList = sampleFiles.map((f) => `  - ${f}`).join("\n");

  return `You are a senior software engineer. Given the following information about a GitHub repository, write a concise overview in plain English (150 words max).

Repository URL: ${repoUrl}

Top-level folders: ${folderList}

Sample TypeScript files:
${fileList}

Instructions:
- Identify the likely tech stack (frameworks, languages, tools) based on file paths.
- Describe the main parts of the codebase and their probable purpose.
- If something is not clear from the file paths alone, say "not clear" rather than guessing.
- Do NOT use markdown formatting — plain text only.
- Keep it under 150 words.`;
}
