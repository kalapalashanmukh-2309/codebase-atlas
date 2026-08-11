/**
 * lib/subgraph-slicer.ts
 *
 * AI Subgraph Diagnosis & Code Slicing Layer for Codebase Atlas (V8).
 * Given a natural language issue description, extracts minimal high-relevance
 * code slices and exact line boundaries for LLM diagnostic context.
 */

import { type BuiltGraph } from "./graph-builder";
import { type SoftwareKnowledgeGraph, resolveConceptQuery } from "./knowledge-graph";

export interface CodeSlice {
  file: string;
  lineRange: [number, number];
  entityName: string;
  relevanceReason: string;
  snippet: string;
}

export interface SubgraphSliceResult {
  query: string;
  primaryConcept?: string;
  slices: CodeSlice[];
  tokenEstimate: number;
}

export function sliceSubgraphForIssue(
  skg: SoftwareKnowledgeGraph,
  graph: BuiltGraph,
  fileContents: { path: string; content: string }[],
  issueQuery: string
): SubgraphSliceResult {
  const conceptResult = resolveConceptQuery(skg, issueQuery);
  const targetNodes = conceptResult ? conceptResult.subnodes : graph.nodes.slice(0, 3);

  const slices: CodeSlice[] = [];
  let totalChars = 0;

  for (const node of targetNodes) {
    const fileItem = fileContents.find((f) => f.path === node.path);
    if (!fileItem) continue;

    const lines = fileItem.content.split("\n");
    const startLine = node.startLine || 1;
    const endLine = node.endLine || Math.min(startLine + 20, lines.length);

    const sliceContent = lines.slice(startLine - 1, endLine).join("\n");
    totalChars += sliceContent.length;

    slices.push({
      file: node.path,
      lineRange: [startLine, endLine],
      entityName: node.name,
      relevanceReason: `Derived from structural entity [${node.name}] (${node.type}) in concept domain [${conceptResult?.concept.domain || "general"}]`,
      snippet: sliceContent,
    });
  }

  return {
    query: issueQuery,
    primaryConcept: conceptResult?.concept.conceptName,
    slices,
    tokenEstimate: Math.round(totalChars / 4),
  };
}
