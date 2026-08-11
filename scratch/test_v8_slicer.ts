/**
 * scratch/test_v8_slicer.ts
 *
 * Test suite verifying AI Subgraph Diagnosis & Minimal Code Slicing (V8).
 */

import { sliceSubgraphForIssue } from "../lib/subgraph-slicer";
import { buildSoftwareKnowledgeGraph } from "../lib/knowledge-graph";
import { type CodeNode } from "../lib/graph-builder";

const sampleNodes: CodeNode[] = [
  { id: "src/orders/OrderController.ts::OrderController", name: "OrderController", label: "OrderController", type: "class", path: "src/orders/OrderController.ts", startLine: 1, endLine: 10 },
  { id: "src/orders/OrderService.ts::OrderService", name: "OrderService", label: "OrderService", type: "class", path: "src/orders/OrderService.ts", startLine: 1, endLine: 15 },
];

const sampleContents = [
  { path: "src/orders/OrderController.ts", content: "export class OrderController { create() { return 'ok'; } }" },
  { path: "src/orders/OrderService.ts", content: "export class OrderService { createOrder() { return 'saved'; } }" },
];

function testSlicer() {
  console.log("=== V8 SUBGRAPH DIAGNOSIS & MINIMAL CODE SLICING VERIFICATION ===");
  const skg = buildSoftwareKnowledgeGraph(sampleNodes, []);
  const result = sliceSubgraphForIssue(skg, { nodes: sampleNodes, edges: [] }, sampleContents, "Issue with orders");

  console.log(`Matched Concept: ${result.primaryConcept}`);
  console.log(`Extracted Slices Count: ${result.slices.length}`);
  console.log(`Token Estimate: ${result.tokenEstimate} tokens`);

  if (result.slices.length === 2 && result.tokenEstimate > 0) {
    console.log("✅ V8 AI Subgraph Slicing Verification PASSED!");
  } else {
    console.error("❌ V8 AI Subgraph Slicing Verification FAILED.");
    process.exit(1);
  }
}

testSlicer();
