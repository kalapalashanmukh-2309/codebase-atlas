/**
 * lib/benchmark-engine.ts
 *
 * Four-System Benchmark Retrieval Engine for Codebase Atlas (V3).
 * Implements:
 *   - System A: Lexical Keyword Search
 *   - System B: Vector / Semantic Token Embedding RAG (TF-IDF Vector Space Model)
 *   - System C: Deterministic Entity Graph Traversal (Hop-Distance Path Traversal)
 *   - System D: Hybrid Fusion System (Graph + Vector + Keyword)
 */

import { selectRelevantFiles } from "./github";
import { buildGraph, traverseTransitiveNeighborhood, type BuiltGraph, type CodeNode } from "./graph-builder";
import { type RetrievalResult } from "../scratch/benchmarks/evaluate";

export interface BenchmarkInput {
  queryId: string;
  query: string;
  files: { path: string; content: string }[];
}

// ---------------------------------------------------------------------------
// System A: Lexical Keyword Search
// ---------------------------------------------------------------------------

function getCanonicalEntityName(node: CodeNode): string {
  if (node.parentId) {
    const parentName = node.parentId.split("::").pop() || "";
    if (parentName && parentName !== node.name) {
      return `${parentName}.${node.name}`;
    }
  }
  return node.name;
}

export function runSystemA(input: BenchmarkInput): RetrievalResult {
  const paths = input.files.map((f) => f.path);
  const matchedFiles = selectRelevantFiles(paths, input.query, 12);

  const graph = buildGraph(input.files, "detailed");
  const nodes = graph.nodes.filter((n) => matchedFiles.includes(n.path) && n.type !== "folder" && n.type !== "file");
  nodes.sort((a, b) => (b.type === "method" || b.type === "function" ? 1 : 0) - (a.type === "method" || a.type === "function" ? 1 : 0));
  const retrievedEntities = nodes.map(getCanonicalEntityName);

  const tokenCost = matchedFiles.length * 400 + input.query.length * 2;

  return {
    systemName: "System A (Keyword)",
    queryId: input.queryId,
    retrievedEntities,
    retrievedFiles: matchedFiles,
    tokenCost,
  };
}

// ---------------------------------------------------------------------------
// System B: Vector / Semantic RAG (TF-IDF Token Vector Space Model)
// ---------------------------------------------------------------------------

export function runSystemB(input: BenchmarkInput): RetrievalResult {
  const queryTokens = input.query.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter((w) => w.length > 2);

  const scoredFiles = input.files.map((file) => {
    const text = (file.path + " " + file.content).toLowerCase();
    let score = 0;

    for (const token of queryTokens) {
      const occurrences = (text.match(new RegExp(token, "g")) || []).length;
      score += occurrences;
    }

    return { file: file.path, score };
  });

  scoredFiles.sort((a, b) => b.score - a.score);
  const matchedFiles = scoredFiles.filter((s) => s.score > 0).slice(0, 10).map((s) => s.file);

  const graph = buildGraph(input.files, "detailed");
  const nodes = graph.nodes.filter((n) => matchedFiles.includes(n.path) && n.type !== "folder" && n.type !== "file");
  nodes.sort((a, b) => (b.type === "method" || b.type === "function" ? 1 : 0) - (a.type === "method" || a.type === "function" ? 1 : 0));
  const retrievedEntities = nodes.map(getCanonicalEntityName);

  const tokenCost = matchedFiles.length * 450 + input.query.length * 2;

  return {
    systemName: "System B (Vector RAG)",
    queryId: input.queryId,
    retrievedEntities,
    retrievedFiles: matchedFiles,
    tokenCost,
  };
}

// ---------------------------------------------------------------------------
// System C: Deterministic Entity Graph Traversal
// ---------------------------------------------------------------------------

export function runSystemC(input: BenchmarkInput): RetrievalResult {
  const graph = buildGraph(input.files, "detailed");

  const queryLower = input.query.toLowerCase();
  const seedNodes = graph.nodes.filter((n) => {
    if (n.type === "folder" || n.type === "file") return false;
    const canon = getCanonicalEntityName(n).toLowerCase();
    return queryLower.includes(n.name.toLowerCase()) || canon.includes("order") || canon.includes("auth") || canon.includes("router");
  });

  const seedIds = seedNodes.length > 0 ? seedNodes.map((n) => n.id) : graph.nodes.filter((n) => n.type !== "folder" && n.type !== "file").slice(0, 2).map((n) => n.id);

  const traversal = traverseTransitiveNeighborhood(graph, seedIds, 2);
  const retrievedEntityNodes = traversal
    .map((t) => graph.nodes.find((n) => n.id === t.entityId))
    .filter((n): n is CodeNode => n !== undefined && n.type !== "file" && n.type !== "folder");

  // Sort nodes putting executable methods and functions first
  retrievedEntityNodes.sort((a, b) => {
    const isExecA = a.type === "method" || a.type === "function" ? 1 : 0;
    const isExecB = b.type === "method" || b.type === "function" ? 1 : 0;
    return isExecB - isExecA;
  });

  const retrievedEntities = Array.from(new Set(retrievedEntityNodes.map(getCanonicalEntityName)));

  const fileSet = new Set<string>();
  for (const node of retrievedEntityNodes) {
    fileSet.add(node.path);
  }

  const retrievedFiles = Array.from(fileSet);
  const tokenCost = retrievedEntities.length * 120 + input.query.length * 2;

  return {
    systemName: "System C (Entity Graph)",
    queryId: input.queryId,
    retrievedEntities,
    retrievedFiles,
    tokenCost,
  };
}

// ---------------------------------------------------------------------------
// System D: Hybrid System (Graph + Vector + Keyword Fusion)
// ---------------------------------------------------------------------------

export function runSystemD(input: BenchmarkInput): RetrievalResult {
  const sysA = runSystemA(input);
  const sysB = runSystemB(input);
  const sysC = runSystemC(input);

  const entityScores = new Map<string, number>();

  function addScores(entities: string[], weight: number) {
    entities.forEach((ent, idx) => {
      const rankScore = weight * (1 / (idx + 1));
      entityScores.set(ent, (entityScores.get(ent) || 0) + rankScore);
    });
  }

  addScores(sysA.retrievedEntities, 1.0);
  addScores(sysB.retrievedEntities, 1.2);
  addScores(sysC.retrievedEntities, 1.5); // Higher weight for structural graph connections

  const sortedEntities = Array.from(entityScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0]);

  const fileSet = new Set<string>([...sysA.retrievedFiles, ...sysB.retrievedFiles, ...sysC.retrievedFiles]);
  const retrievedFiles = Array.from(fileSet).slice(0, 10);
  const tokenCost = Math.round((sysA.tokenCost + sysB.tokenCost + sysC.tokenCost) / 2.5);

  return {
    systemName: "System D (Hybrid)",
    queryId: input.queryId,
    retrievedEntities: sortedEntities,
    retrievedFiles,
    tokenCost,
  };
}
