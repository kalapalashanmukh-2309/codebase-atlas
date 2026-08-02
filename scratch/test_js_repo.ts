/**
 * Scratch test script for JS/JSX/MJS/CJS repository analysis.
 */
import { parseGitHubUrl, fetchRepoTree, buildAnalyzeResult } from "../lib/github";
import { buildGraph } from "../lib/graph-builder";

async function testJSRepo(url: string) {
  console.log(`\n================ Analyzing JS Repo: ${url} ================`);
  const { owner, repo } = parseGitHubUrl(url);
  const tree = await fetchRepoTree(owner, repo);
  const analysis = buildAnalyzeResult(tree);

  console.log(`Total Source Files (.js, .jsx, .ts, .tsx, .mjs, .cjs): ${analysis.files.length}`);
  console.log("Sample Files:");
  analysis.files.slice(0, 10).forEach((f, i) => console.log(`  ${i + 1}. ${f}`));

  const highLevel = buildGraph(analysis.files, "high-level");
  console.log(`High-Level Graph -> Nodes: ${highLevel.nodes.length}, Edges: ${highLevel.edges.length}`);

  const detailed = buildGraph(analysis.files, "detailed");
  console.log(`Detailed Graph   -> Nodes: ${detailed.nodes.length}, Edges: ${detailed.edges.length}`);
}

async function main() {
  await testJSRepo("https://github.com/expressjs/express");
  await testJSRepo("https://github.com/axios/axios");
}

main().catch(console.error);
