import {
  parseGitHubUrl,
  fetchRepoTree,
  buildAnalyzeResult,
  selectRelevantFiles,
  fetchFileContent,
} from "../lib/github";
import { answerQuestion } from "../lib/qa";

const REPO_URL = "https://github.com/tj/commander.js";
const QUESTION = "Where is command parsing handled?";

async function main() {
  const { owner, repo } = parseGitHubUrl(REPO_URL);
  const tree = await fetchRepoTree(owner, repo);
  const analysis = buildAnalyzeResult(tree);

  const folders = analysis.graph.nodes
    .filter((n) => n.type === "folder")
    .map((n) => n.label);

  console.log("\n================ Testing Code Snippets in Q&A ================");
  console.log(`Question: "${QUESTION}"`);

  const targetFiles = selectRelevantFiles(analysis.files, QUESTION, 12);

  const snippets = (
    await Promise.all(
      targetFiles.map(async (filePath) => {
        const content = await fetchFileContent(owner, repo, filePath, 3000);
        return content ? { path: filePath, content } : null;
      })
    )
  ).filter((s): s is { path: string; content: string } => s !== null);

  const result = await answerQuestion({
    repoUrl: REPO_URL,
    question: QUESTION,
    folders,
    files: analysis.files,
    snippets,
  });

  console.log("\n--- Explanation Text ---");
  console.log(result.answer);

  console.log("\n--- Extracted Code Snippets ---");
  console.dir(result.codeSnippets, { depth: null });
}

main().catch(console.error);
