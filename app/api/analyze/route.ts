/**
 * POST /api/analyze
 *
 * Accepts { repoUrl: string }, fetches the repo's file tree from GitHub,
 * collects TypeScript files, generates an AI overview, and returns a
 * basic graph structure.
 */
import {
  parseGitHubUrl,
  fetchRepoTree,
  buildAnalyzeResult,
  fetchFileContent,
} from "@/lib/github";
import { generateOverview } from "@/lib/overview";
import { countFunctionCalls } from "@/lib/ast-counts";

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

    // 4. Concurrently fetch content for sample files to calculate function/hook counts
    const sampleFiles = result.files.slice(0, 15);
    const snippetPromises = sampleFiles.map(async (filePath) => {
      const content = await fetchFileContent(owner, repo, filePath, 4000);
      return content ? { path: filePath, content } : null;
    });

    const snippetResults = await Promise.all(snippetPromises);
    const fetchedFiles = snippetResults.filter(
      (s): s is { path: string; content: string } => s !== null
    );

    if (fetchedFiles.length > 0) {
      result.functionCounts = countFunctionCalls(fetchedFiles);
    }

    // 5. Generate an AI overview (single LLM call, falls back gracefully)
    const folders = result.graph.nodes
      .filter((n) => n.type === "folder")
      .map((n) => n.label);

    result.overview = await generateOverview({
      repoUrl,
      folders,
      sampleFiles,
    });

    return Response.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred.";

    let status = 500;
    if (
      message.includes("Invalid GitHub repository URL") ||
      message.includes("404")
    ) {
      status = 400;
    } else if (message.includes("403")) {
      status = 429;
    }

    return Response.json({ error: message }, { status });
  }
}
