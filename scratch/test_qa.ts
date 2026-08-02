/**
 * Scratch test: run the Q&A pipeline against tj/commander.js
 * with three example questions and print the answers.
 *
 * Usage:  npx tsx scratch/test_qa.ts
 */
import {
  parseGitHubUrl,
  fetchRepoTree,
  buildAnalyzeResult,
  selectRelevantFiles,
  fetchFileContent,
} from "../lib/github";
import { answerQuestion } from "../lib/qa";

const REPO_URL = "https://github.com/tj/commander.js";

const QUESTIONS = [
  "What is the main purpose of this library?",
  "Where does command parsing happen?",
  "How is configuration handled?",
];

async function main() {
  const { owner, repo } = parseGitHubUrl(REPO_URL);
  const tree = await fetchRepoTree(owner, repo);
  const analysis = buildAnalyzeResult(tree);

  const folders = analysis.graph.nodes
    .filter((n) => n.type === "folder")
    .map((n) => n.label);

  for (const question of QUESTIONS) {
    console.log("\n" + "=".repeat(70));
    console.log(`Q: ${question}`);
    console.log("=".repeat(70));

    const targetFiles = selectRelevantFiles(analysis.files, question, 12);

    const snippets = (
      await Promise.all(
        targetFiles.map(async (filePath) => {
          const content = await fetchFileContent(owner, repo, filePath, 3000);
          return content ? { path: filePath, content } : null;
        }),
      )
    ).filter((s): s is { path: string; content: string } => s !== null);

    const answer = await answerQuestion({
      repoUrl: REPO_URL,
      question,
      folders,
      files: analysis.files,
      snippets,
    });

    console.log(`\nA: ${answer}\n`);
  }
}

main().catch(console.error);
