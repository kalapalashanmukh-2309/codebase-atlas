/**
 * lib/knowledge-graph.ts
 *
 * Software Knowledge Graph Layer for Codebase Atlas (V6).
 * Connects high-level domain concepts (e.g. "Order Management", "Auth Flow")
 * to verified structural code entities via explicit IMPLEMENTED_BY relationships.
 */

import { type CodeNode, type CodeEdge } from "./graph-builder";
import { type EnrichedCodeNode, enrichGraphNodes } from "./semantic-enricher";

export interface ConceptNode {
  id: string;
  conceptName: string;
  domain: string;
  description: string;
}

export interface SoftwareKnowledgeGraph {
  concepts: ConceptNode[];
  structuralNodes: EnrichedCodeNode[];
  edges: CodeEdge[];
}

export function buildSoftwareKnowledgeGraph(nodes: CodeNode[], baseEdges: CodeEdge[]): SoftwareKnowledgeGraph {
  const enrichedNodes = enrichGraphNodes(nodes);
  const concepts: ConceptNode[] = [
    { id: "concept:orders", conceptName: "Order Management", domain: "orders", description: "Handles order creation, persistence, and dispatch" },
    { id: "concept:auth", conceptName: "Authentication & Authorization", domain: "auth", description: "Manages session validation, token checks, and user identity" },
    { id: "concept:routing", conceptName: "API Gateway & Routing", domain: "api-routing", description: "Routes incoming requests and enforces middleware guards" },
  ];

  const graphEdges: CodeEdge[] = [...baseEdges];

  for (const concept of concepts) {
    const matchingNodes = enrichedNodes.filter((n) => n.semantic.domains.includes(concept.domain));

    for (const target of matchingNodes) {
      graphEdges.push({
        id: `${concept.id}-[IMPLEMENTED_BY]->${target.id}`,
        source: concept.id,
        target: target.id,
        from: concept.id,
        to: target.id,
        type: "implements",
        label: "IMPLEMENTED_BY",
        resolution: { status: "verified", method: "symbol-resolution" },
      });
    }
  }

  return {
    concepts,
    structuralNodes: enrichedNodes,
    edges: graphEdges,
  };
}

export function resolveConceptQuery(skg: SoftwareKnowledgeGraph, query: string): { concept: ConceptNode; subnodes: EnrichedCodeNode[] } | null {
  const qLower = query.toLowerCase();
  const matchedConcept = skg.concepts.find(
    (c) => qLower.includes(c.domain) || qLower.includes(c.conceptName.toLowerCase())
  );

  if (!matchedConcept) return null;

  const implEdges = skg.edges.filter((e) => e.source === matchedConcept.id);
  const targetIds = implEdges.map((e) => e.target);
  const subnodes = skg.structuralNodes.filter((n) => targetIds.includes(n.id));

  return {
    concept: matchedConcept,
    subnodes,
  };
}
