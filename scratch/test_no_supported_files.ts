/**
 * Scratch test script for non-JS repository analysis.
 */
import { parseGitHubUrl, fetchRepoTree, buildAnalyzeResult } from "../lib/github";

async function testNonJSRepo(url: string) {
  console.log(`\n================ Analyzing Non-JS Repo: ${url} ================`);
  const { owner, repo } = parseGitHubUrl(url);
  const tree = await fetchRepoTree(owner, repo);
  const analysis = buildAnalyzeResult(tree);

  console.log(`noSupportedFiles flag: ${analysis.noSupportedFiles}`);
  console.log(`Files count: ${analysis.files.length}`);
  console.log(`Overview: ${analysis.overview}`);
}

async function main() {
  await testNonJSRepo("https://github.com/psf/requests");
  await testNonJSRepo("https://github.com/gin-gonic/gin");
}

main().catch(console.error);
