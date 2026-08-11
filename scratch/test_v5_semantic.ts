/**
 * scratch/test_v5_semantic.ts
 *
 * Test suite verifying AI Semantic Enrichment layer (V5).
 */

import { enrichGraphNodes } from "../lib/semantic-enricher";
import { type CodeNode } from "../lib/graph-builder";

const testNodes: CodeNode[] = [
  { id: "1", name: "OrderController", label: "OrderController", type: "class", path: "src/orders/OrderController.ts" },
  { id: "2", name: "validateToken", label: "validateToken", type: "method", path: "src/auth/AuthService.ts" },
  { id: "3", name: "sendNotification", label: "sendNotification", type: "method", path: "src/notifications/NotificationService.ts" },
];

function testSemantic() {
  console.log("=== V5 AI SEMANTIC ENRICHMENT VERIFICATION ===");
  const enriched = enrichGraphNodes(testNodes);

  for (const n of enriched) {
    console.log(`Node [${n.name}]: Domains=[${n.semantic.domains.join(", ")}], Features=[${n.semantic.features.join(", ")}], Actions=[${n.semantic.actions.join(", ")}]`);
  }

  const hasOrderDomain = enriched.some((n) => n.semantic.domains.includes("orders"));
  const hasAuthDomain = enriched.some((n) => n.semantic.domains.includes("auth"));

  if (hasOrderDomain && hasAuthDomain) {
    console.log("✅ V5 AI Semantic Enrichment Verification PASSED!");
  } else {
    console.error("❌ V5 AI Semantic Enrichment Verification FAILED.");
    process.exit(1);
  }
}

testSemantic();
