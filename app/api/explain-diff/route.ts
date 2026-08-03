/**
 * POST /api/explain-diff
 *
 * Accepts { diff: string, repoUrl?: string } and returns a structured JSON
 * explanation containing summary, affectedModules, keyChanges, and risks.
 */

import {
  EXPLAIN_DIFF_PROMPT,
  parseDiffExplanationJson,
  type DiffExplanation,
} from "@/lib/diff-explainer";

const GEMINI_MODEL = "gemini-2.5-flash";

interface ExplainDiffRequest {
  diff?: string;
  repoUrl?: string;
}

export async function POST(request: Request) {
  let body: ExplainDiffRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const { diff, repoUrl } = body;

  if (!diff || !diff.trim()) {
    return Response.json(
      { error: "diff parameter is required." },
      { status: 400 }
    );
  }

  const cleanDiff = diff.trim();
  const apiKey = process.env.GEMINI_API_KEY;

  // Extract modified files from diff header regex
  const fileMatches = Array.from(
    cleanDiff.matchAll(/(?:---|\+\+\+)\s+[ab]\/(.+)/g)
  ).map((m) => m[1]);
  const affectedFiles = Array.from(new Set(fileMatches));

  if (!apiKey) {
    // Fallback if API key is not configured
    const additionCount = (cleanDiff.match(/^\+[^+]/gm) || []).length;
    const deletionCount = (cleanDiff.match(/^-[^-]/gm) || []).length;

    const fallbackExplanation: DiffExplanation = {
      summary: `This diff modifies ${affectedFiles.length} file(s) with +${additionCount} additions and -${deletionCount} deletions. (Offline Mode)`,
      affectedModules: affectedFiles.length > 0 ? affectedFiles : ["Repository Source Files"],
      keyChanges: [
        `Added ${additionCount} line(s) across modified files.`,
        `Removed ${deletionCount} line(s) across modified files.`,
        "Pasted patch contains unified diff syntax.",
      ],
      risks: [
        "GEMINI_API_KEY is not configured for full AI architectural risk analysis.",
        "Ensure all modified functions have corresponding unit test coverage.",
      ],
    };

    return Response.json({
      explanation: fallbackExplanation,
      summary: fallbackExplanation.summary,
      affectedModules: fallbackExplanation.affectedModules,
      keyChanges: fallbackExplanation.keyChanges,
      risks: fallbackExplanation.risks,
      affectedFiles,
    });
  }

  const userPrompt = `${EXPLAIN_DIFF_PROMPT}

${repoUrl ? `Repository Context: ${repoUrl}` : ""}

\`\`\`diff
${cleanDiff.slice(0, 12000)}
\`\`\``;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
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

    const explanation = parseDiffExplanationJson(rawText, affectedFiles);

    return Response.json({
      explanation,
      summary: explanation.summary,
      affectedModules: explanation.affectedModules,
      keyChanges: explanation.keyChanges,
      risks: explanation.risks,
      affectedFiles,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return Response.json({ error: message }, { status: 500 });
  }
}
