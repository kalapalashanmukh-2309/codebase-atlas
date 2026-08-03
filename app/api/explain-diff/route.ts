/**
 * POST /api/explain-diff
 *
 * Accepts { diff: string, repoUrl?: string, prUrl?: string } and generates
 * an AI-powered explanation of the code changes, affected files, logic walkthrough,
 * and potential impact.
 */

const GEMINI_MODEL = "gemini-2.5-flash";

interface ExplainDiffRequest {
  diff?: string;
  repoUrl?: string;
  prUrl?: string;
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

  const { diff, repoUrl, prUrl } = body;

  if (!diff || !diff.trim()) {
    return Response.json(
      { error: "diff parameter is required." },
      { status: 400 }
    );
  }

  const cleanDiff = diff.trim();
  const apiKey = process.env.GEMINI_API_KEY;

  // Extract modified files from diff header regex for metadata
  const fileMatches = Array.from(
    cleanDiff.matchAll(/(?:---|\+\+\+)\s+[ab]\/(.+)/g)
  ).map((m) => m[1]);

  const affectedFiles = Array.from(new Set(fileMatches));

  if (!apiKey) {
    // Deterministic fallback if API key is unconfigured
    const additionCount = (cleanDiff.match(/^\+[^+]/gm) || []).length;
    const deletionCount = (cleanDiff.match(/^-[^-]/gm) || []).length;

    const fallbackMarkdown = `### 📝 Diff Summary (Offline Mode)
**Files Modified**: ${affectedFiles.length > 0 ? affectedFiles.join(", ") : "Detected from diff"}
**Lines Added**: +${additionCount}
**Lines Removed**: -${deletionCount}

> [!NOTE]
> GEMINI_API_KEY is not configured. Add your API key to environment variables for detailed AI explanation.

#### Raw Changes Overview
\`\`\`diff
${cleanDiff.slice(0, 1500)}${cleanDiff.length > 1500 ? "\n... (truncated)" : ""}
\`\`\`
`;

    return Response.json({
      explanation: fallbackMarkdown,
      affectedFiles,
      additions: additionCount,
      deletions: deletionCount,
    });
  }

  // Construct LLM prompt
  const systemInstruction = `You are an expert principal software engineer analyzing code diffs and pull requests.
Provide a clear, scannable, and developer-friendly explanation of the provided diff.
Structure your response in Markdown using standard headers and emojis:
1. 📝 **Summary**: 2-3 sentence overview of what this diff accomplishes.
2. 📁 **Affected Files**: list each file with additions/deletions.
3. 🔍 **Detailed Breakdown**: key code changes, logic updates, or refactorings.
4. ⚠️ **Impact & Considerations**: security, performance, or edge cases to consider.`;

  const userPrompt = `Please explain the following diff:

${repoUrl ? `Repository Context: ${repoUrl}` : ""}
${prUrl ? `Pull Request URL: ${prUrl}` : ""}

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
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2000,
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
      "Unable to generate explanation for this diff.";

    return Response.json({
      explanation: rawText,
      affectedFiles,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return Response.json({ error: message }, { status: 500 });
  }
}
