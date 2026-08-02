import { buildRepoUrl, normalizeRepoQuery } from "../lib/url-builder";

console.log("\n================ Testing normalizeRepoQuery ================");

const repoUrl = "https://github.com/tj/commander.js";

// Scenario 1: Default high-level mode
console.log("\n1. Default High-Level Mode (Omitted from URL):");
console.log(buildRepoUrl(repoUrl, { graphMode: "high-level" }));

// Scenario 2: Detailed Mode
console.log("\n2. Detailed Mode:");
console.log(buildRepoUrl(repoUrl, { graphMode: "detailed" }));

// Scenario 3: Unsorted & Duplicate Focus Files
console.log("\n3. Unsorted & Duplicate Focus Files:");
const messyState = {
  graphMode: "detailed" as const,
  focusFiles: ["lib/command.js", "index.js", "lib/command.js ", "lib/option.js"],
};
console.log(buildRepoUrl(repoUrl, messyState));
