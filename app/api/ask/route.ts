/**
 * POST /api/ask
 *
 * Accepts { repoUrl: string, question: string }, fetches repo metadata and
 * relevant file snippets, and uses AI to answer the user's question.
 */
import {
  parseGitHubUrl,
  fetchRepoTree,
  buildAnalyzeResult,
  selectRelevantFiles,
  fetchFileContent,
} from "@/lib/github";
import { answerQuestion } from "@/lib/qa";

export async function POST(request: Request) {
  let body: { repoUrl?: string; question?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const { repoUrl, question } = body;

  if (!repoUrl || !question || !question.trim()) {
    return Response.json(
      { error: "both repoUrl and question are required." },
      { status: 400 }
    );
  }

  try {
    // 1. Parse GitHub URL
    const { owner, repo } = parseGitHubUrl(repoUrl);

    // 2. Fetch repo tree & build graph context
    const tree = await fetchRepoTree(owner, repo);
    const analysis = buildAnalyzeResult(tree);

    // 3. Select top relevant files based on the question (up to 12)
    const targetFiles = selectRelevantFiles(analysis.files, question, 12);

    // 4. Concurrently fetch file content snippets (up to 3000 chars each)
    const snippetPromises = targetFiles.map(async (filePath) => {
      const content = await fetchFileContent(owner, repo, filePath, 3000);
      return content ? { path: filePath, content } : null;
    });

    const snippetResults = await Promise.all(snippetPromises);
    const snippets = snippetResults.filter(
      (s): s is { path: string; content: string } => s !== null
    );

    // 5. Extract top-level folder names
    const folders = analysis.graph.nodes
      .filter((n) => n.type === "folder")
      .map((n) => n.label);

    // 6. Generate AI answer
    const result = await answerQuestion({
      repoUrl,
      question: question.trim(),
      folders,
      files: analysis.files,
      snippets,
    });

    return Response.json({
      answer: result.answer,
      referencedFiles: result.referencedFiles,
      focusFiles: result.focusFiles,
      summary: result.summary,
      isFlowQuestion: result.isFlowQuestion,
      codeSnippets: result.codeSnippets,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";

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
