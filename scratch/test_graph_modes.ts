/**
 * Scratch script to verify buildGraph output in "high-level" vs "detailed" modes.
 */
import { parseGitHubUrl, fetchRepoTree, buildAnalyzeResult } from "../lib/github";
import { buildGraph } from "../lib/graph-builder";

async function testRepo(url: string) {
  const { owner, repo } = parseGitHubUrl(url);
  console.log(`\n================ Testing ${owner}/${repo} ================`);
  const tree = await fetchRepoTree(owner, repo);
  const analysis = buildAnalyzeResult(tree);

  console.log(`Total TypeScript files in repo scope: ${analysis.files.length}`);

  const highLevelGraph = buildGraph(analysis.files, "high-level");
  console.log(`High-Level Mode  -> Nodes: ${highLevelGraph.nodes.length}, Edges: ${highLevelGraph.edges.length}`);

  const detailedGraph = buildGraph(analysis.files, "detailed");
  console.log(`Detailed Mode    -> Nodes: ${detailedGraph.nodes.length}, Edges: ${detailedGraph.edges.length}`);
}

async function main() {
  await testRepo("https://github.com/tj/commander.js");
  await testRepo("https://github.com/facebook/react");
}

main().catch(console.error);
