/**
 * POST /api/analyze
 *
 * Accepts { repoUrl: string }, fetches the repo's file tree from GitHub,
 * collects TypeScript files, and returns a basic graph structure.
 */
import {
  parseGitHubUrl,
  fetchRepoTree,
  buildAnalyzeResult,
} from "@/lib/github";

export async function POST(request: Request) {
  let body: { repoUrl?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { repoUrl } = body;

  if (!repoUrl) {
    return Response.json(
      { error: "repoUrl is required." },
      { status: 400 }
    );
  }

  try {
    // 1. Parse the GitHub URL into owner/repo
    const { owner, repo } = parseGitHubUrl(repoUrl);

    // 2. Fetch the full recursive tree via the Git Trees API (one request)
    const tree = await fetchRepoTree(owner, repo);

    // 3. Build the analysis result (TS files + graph)
    const result = buildAnalyzeResult(tree);

    return Response.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred.";

    // Surface rate-limit errors as 429, everything else as 500
    const status = message.includes("403") ? 429 : 500;

    return Response.json({ error: message }, { status });
  }
}
