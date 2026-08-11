/**
 * scratch/test_v4_cpg.ts
 *
 * Test suite verifying Code Property Graph (CPG) construction, CFG branching,
 * and PDG data-flow edge extraction.
 */

import { buildCodePropertyGraph } from "../lib/cpg-builder";

const sampleFiles = [
  {
    path: "src/orders/OrderService.ts",
    content: `
export class OrderService {
  async processOrder(orderId: string) {
    const isExpress = orderId.startsWith("EXP");
    if (isExpress) {
      const priority = 1;
      return priority;
    }
    for (let i = 0; i < 3; i++) {
      console.log("retry " + i);
    }
    return 0;
  }
}
`,
  },
];

function testCpg() {
  console.log("=== V4 CODE PROPERTY GRAPH (CPG) VERIFICATION ===");
  const cpg = buildCodePropertyGraph(sampleFiles);

  const controlEdges = cpg.edges.filter((e) => e.flowCategory === "CONTROL_FLOW");
  const dataEdges = cpg.edges.filter((e) => e.flowCategory === "DATA_FLOW");

  console.log(`Total CPG Nodes: ${cpg.nodes.length}`);
  console.log(`AST Edges: ${cpg.edges.filter((e) => e.flowCategory === "AST").length}`);
  console.log(`Control Flow Edges (CFG): ${controlEdges.length}`);
  console.log(`Data Flow Edges (PDG): ${dataEdges.length}`);
  console.log(`Data Dependencies: ${cpg.dataDependencies.length}`);

  if (controlEdges.length > 0 && dataEdges.length > 0) {
    console.log("✅ V4 CPG Verification PASSED: CFG branching & PDG data flow successfully combined!");
  } else {
    console.error("❌ V4 CPG Verification FAILED: Missing CFG or PDG edges.");
    process.exit(1);
  }
}

testCpg();
