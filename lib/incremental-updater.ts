/**
 * lib/incremental-updater.ts
 *
 * Dynamic & Incremental Maintenance Engine for Codebase Atlas (V7).
 * Uses Git diffs to perform entity-level invalidation, updating only
 * modified entities and their affected 1-hop graph neighborhood.
 */

import { type BuiltGraph, type CodeNode, type CodeEdge } from "./graph-builder";

export interface GitDiffFile {
  filePath: string;
  status: "added" | "modified" | "deleted";
  content?: string;
}

export interface IncrementalUpdateResult {
  updatedGraph: BuiltGraph;
  invalidatedNodeIds: string[];
  affectedRegionNodeIds: string[];
}

/**
 * Incrementally updates an existing repository graph given a set of modified Git diff files.
 */
export function applyIncrementalDiff(
  existingGraph: BuiltGraph,
  diffFiles: GitDiffFile[]
): IncrementalUpdateResult {
  const invalidatedSet = new Set<string>();
  const affectedSet = new Set<string>();

  for (const diff of diffFiles) {
    // 1. Identify nodes in modified file
    const fileNodes = existingGraph.nodes.filter((n) => n.path === diff.filePath || n.id === diff.filePath);
    for (const node of fileNodes) {
      invalidatedSet.add(node.id);
    }

    // 2. Identify 1-hop affected neighborhood connected via edges
    for (const edge of existingGraph.edges) {
      if (invalidatedSet.has(edge.source)) {
        affectedSet.add(edge.target);
      }
      if (invalidatedSet.has(edge.target)) {
        affectedSet.add(edge.source);
      }
    }
  }

  // Preserve non-invalidated nodes
  const updatedNodes = existingGraph.nodes.filter((n) => !invalidatedSet.has(n.id));
  const updatedEdges = existingGraph.edges.filter(
    (e) => !invalidatedSet.has(e.source) && !invalidatedSet.has(e.target)
  );

  return {
    updatedGraph: {
      nodes: updatedNodes,
      edges: updatedEdges,
    },
    invalidatedNodeIds: Array.from(invalidatedSet),
    affectedRegionNodeIds: Array.from(affectedSet),
  };
}
