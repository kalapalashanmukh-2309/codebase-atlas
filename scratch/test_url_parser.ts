import { parseRepoViewState } from "../lib/url-builder";

console.log("\n================ Testing parseRepoViewState ================");

// Case 1: Missing params
const search1 = new URLSearchParams("url=https://github.com/tj/commander.js");
console.log("\n1. Missing params:");
console.log(parseRepoViewState(search1));

// Case 2: Invalid graph mode
const search2 = new URLSearchParams("url=https://github.com/tj/commander.js&graph=invalid_mode");
console.log("\n2. Invalid graph mode:");
console.log(parseRepoViewState(search2));

// Case 3: Valid permalink
const search3 = new URLSearchParams("url=https://github.com/tj/commander.js&graph=detailed&focusFile=lib/command.js");
console.log("\n3. Valid permalink:");
console.log(parseRepoViewState(search3));
