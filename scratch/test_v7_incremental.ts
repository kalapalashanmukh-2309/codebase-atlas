/**
 * scratch/test_v7_incremental.ts
 *
 * Test suite verifying Dynamic & Incremental Maintenance Engine (V7).
 */

import { applyIncrementalDiff, type GitDiffFile } from "../lib/incremental-updater";
import { type BuiltGraph } from "../lib/graph-builder";

const initialGraph: BuiltGraph = {
  nodes: [
    { id: "src/orders/OrderService.ts", name: "OrderService.ts", label: "OrderService.ts", type: "file", path: "src/orders/OrderService.ts" },
    { id: "src/notifications/NotificationService.ts", name: "NotificationService.ts", label: "NotificationService.ts", type: "file", path: "src/notifications/NotificationService.ts" },
  ],
  edges: [
    { id: "e1", source: "src/orders/OrderService.ts", target: "src/notifications/NotificationService.ts", from: "src/orders/OrderService.ts", to: "src/notifications/NotificationService.ts", type: "calls" },
  ],
};

function testIncremental() {
  console.log("=== V7 DYNAMIC & INCREMENTAL MAINTENANCE VERIFICATION ===");
  const diffs: GitDiffFile[] = [
    { filePath: "src/orders/OrderService.ts", status: "modified" },
  ];

  const result = applyIncrementalDiff(initialGraph, diffs);

  console.log(`Invalidated Nodes: ${result.invalidatedNodeIds.join(", ")}`);
  console.log(`Affected Neighborhood Nodes: ${result.affectedRegionNodeIds.join(", ")}`);
  console.log(`Preserved Graph Nodes Count: ${result.updatedGraph.nodes.length}`);

  if (result.invalidatedNodeIds.includes("src/orders/OrderService.ts") && result.affectedRegionNodeIds.includes("src/notifications/NotificationService.ts")) {
    console.log("✅ V7 Dynamic Incremental Invalidation Verification PASSED!");
  } else {
    console.error("❌ V7 Dynamic Incremental Maintenance Verification FAILED.");
    process.exit(1);
  }
}

testIncremental();
