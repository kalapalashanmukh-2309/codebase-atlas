/**
 * scratch/test_v6_knowledge_graph.ts
 *
 * Test suite verifying Software Knowledge Graph layer (V6).
 */

import { buildSoftwareKnowledgeGraph, resolveConceptQuery } from "../lib/knowledge-graph";
import { type CodeNode } from "../lib/graph-builder";

const sampleNodes: CodeNode[] = [
  { id: "src/orders/OrderController.ts::OrderController", name: "OrderController", label: "OrderController", type: "class", path: "src/orders/OrderController.ts" },
  { id: "src/orders/OrderService.ts::OrderService", name: "OrderService", label: "OrderService", type: "class", path: "src/orders/OrderService.ts" },
  { id: "src/auth/AuthService.ts::AuthService", name: "AuthService", label: "AuthService", type: "class", path: "src/auth/AuthService.ts" },
];

function testKnowledgeGraph() {
  console.log("=== V6 SOFTWARE KNOWLEDGE GRAPH VERIFICATION ===");
  const skg = buildSoftwareKnowledgeGraph(sampleNodes, []);

  console.log(`Concepts Registered: ${skg.concepts.length}`);
  console.log(`Total KG Edges: ${skg.edges.length}`);

  const orderResult = resolveConceptQuery(skg, "I have an issue with orders");

  if (orderResult && orderResult.subnodes.length >= 2) {
    console.log(`Matched Concept: ${orderResult.concept.conceptName}`);
    console.log(`Resolved Code Subnodes: ${orderResult.subnodes.map((n) => n.name).join(", ")}`);
    console.log("✅ V6 Software Knowledge Graph Verification PASSED!");
  } else {
    console.error("❌ V6 Software Knowledge Graph Verification FAILED.");
    process.exit(1);
  }
}

testKnowledgeGraph();
