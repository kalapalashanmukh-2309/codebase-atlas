import { detectRepoGuide } from "../lib/repo-guide";

console.log("\n================ Testing Repo Guide Classifier ================");

const cliFiles = [
  "bin/commander.js",
  "lib/command.js",
  "lib/option.js",
  "tests/command.action.test.js",
];

const reactFiles = [
  "src/components/Header.tsx",
  "src/components/Sidebar.tsx",
  "src/pages/index.tsx",
  "src/hooks/useAuth.ts",
];

const expressFiles = [
  "src/routes/users.ts",
  "src/controllers/auth.ts",
  "src/middleware/auth.ts",
  "src/server.ts",
];

console.log("\n1. Testing CLI File List:");
console.log(detectRepoGuide(cliFiles));

console.log("\n2. Testing React App File List:");
console.log(detectRepoGuide(reactFiles));

console.log("\n3. Testing Express API File List:");
console.log(detectRepoGuide(expressFiles));
