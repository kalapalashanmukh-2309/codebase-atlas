/**
 * lib/diff-explainer.ts
 *
 * Backend helper module to generate structured AI explanations of unified code diffs
 * using Gemini API with structured JSON output.
 */

const GEMINI_MODEL = "gemini-2.5-flash";

export type DiffExplanation = {
  summary: string;
  affectedModules: string[];
  keyChanges: string[];
  risks: string[];
};

export const EXPLAIN_DIFF_PROMPT = `You are an assistant that explains code diffs to developers.
You are given a unified diff.
Return a JSON object with:
- summary: 2–4 sentences describing what this change does at a high level.
- affectedModules: list of file paths or modules that are most impacted.
- keyChanges: 3–6 bullet points describing the main changes.
- risks: 2–4 bullet points describing potential risks or things reviewers should pay attention to.

Focus on architectural impact, not just line-by-line description.
Mention which high-level areas are affected (e.g. auth, routing, data layer, state management, API routes).
Do NOT include markdown formatting or backticks around the JSON. Return ONLY raw JSON.`;

/**
 * Parses raw LLM JSON response string robustly.
 */
export function parseDiffExplanationJson(rawText: string, fallbackFiles: string[]): DiffExplanation {
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
      summary: typeof parsed.summary === "string" ? parsed.summary : "Code changes in repository files.",
      affectedModules: Array.isArray(parsed.affectedModules) && parsed.affectedModules.length > 0
        ? parsed.affectedModules
        : fallbackFiles,
      keyChanges: Array.isArray(parsed.keyChanges) ? parsed.keyChanges : ["Modified source code."],
      risks: Array.isArray(parsed.risks) ? parsed.risks : ["Ensure standard unit tests pass."],
    };
  } catch {
    return {
      summary: "This diff modifies repository source code.",
      affectedModules: fallbackFiles,
      keyChanges: ["Updated source files based on provided diff patch."],
      risks: ["Review changed lines carefully for unintended side effects."],
    };
  }
}
