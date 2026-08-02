import { isImportantFile, isLowValueFile, getTopLevelFolder, buildGraph } from "../lib/graph-builder";

// 1. Synthetic test cases
console.log("=== Testing Helper Rules ===");

const testPaths = [
  { path: "src/index.ts", expectedImportant: true, expectedLowValue: false },
  { path: "src/main.tsx", expectedImportant: true, expectedLowValue: false },
  { path: "src/cli.ts", expectedImportant: true, expectedLowValue: false },
  { path: "src/components/Button.tsx", expectedImportant: false, expectedLowValue: false },
  { path: "src/components/Button.test.tsx", expectedImportant: false, expectedLowValue: true },
  { path: "src/types/index.d.ts", expectedImportant: true, expectedLowValue: true },
  { path: "src/components/foo/utils.ts", expectedImportant: false, expectedLowValue: true }, // deep utils (depth 3)
  { path: "src/utils.ts", expectedImportant: true, expectedLowValue: false }, // top-level utils
];

for (const t of testPaths) {
  const imp = isImportantFile(t.path, "src/");
  const low = isLowValueFile(t.path, "src/");
  const folder = getTopLevelFolder(t.path, "src/");
  console.log(
    `File: ${t.path.padEnd(35)} | Folder: ${String(folder).padEnd(12)} | Imp: ${imp} (exp ${t.expectedImportant}) | Low: ${low} (exp ${t.expectedLowValue})`
  );
}

// 2. Synthetic Graph Test
console.log("\n=== Testing Graph Construction ===");
const sampleFiles = [
  "src/index.ts",
  "src/app.tsx",
  "src/components/Header.tsx",
  "src/components/Footer.tsx",
  "src/components/Button.test.tsx",
  "src/components/foo/utils.ts",
  "src/routes/home.ts",
  "src/routes/api.ts",
  "src/routes/index.ts",
];

const hl = buildGraph(sampleFiles, "high-level");
console.log("\nHigh-Level Mode Nodes:");
hl.nodes.forEach((n) => console.log(`  - [${n.type.toUpperCase()}] ${n.label} (${n.id})`));

const dt = buildGraph(sampleFiles, "detailed");
console.log(`\nDetailed Mode Nodes Count: ${dt.nodes.length}`);
