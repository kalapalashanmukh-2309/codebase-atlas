import { parseGitHubUrl, fetchRepoTree, buildAnalyzeResult } from "../lib/github";

async function testRepo(repoUrl: string) {
  console.log(`\n================ Testing Monorepo Detection: ${repoUrl} ================`);
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const tree = await fetchRepoTree(owner, repo);
  const result = buildAnalyzeResult(tree);

  console.log("isMonorepo:", result.monorepoInfo.isMonorepo);
  if (result.monorepoInfo.isMonorepo) {
    console.log(`Found ${result.monorepoInfo.workspaces?.length} Workspaces:`);
    result.monorepoInfo.workspaces?.forEach((w) => {
      console.log(`  - Name: ${w.name} | Path: ${w.path} | Source Files: ${w.files.length}`);
    });
  } else {
    console.log("Single-package repository detected.");
  }
}

async function main() {
  // Test 1: Single package repository
  await testRepo("https://github.com/tj/commander.js");

  // Test 2: Monorepo repository (e.g. facebook/docusaurus)
  await testRepo("https://github.com/facebook/docusaurus");
}

main().catch(console.error);
