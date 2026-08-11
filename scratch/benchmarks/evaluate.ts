/**
 * scratch/benchmarks/evaluate.ts
 *
 * Evaluator script computing the 7 mathematical research metrics for
 * System A (Keyword Search), System B (Vector RAG), System C (Entity Graph Traversal),
 * and System D (Hybrid System) against ground truth annotations.
 */

import queries from "./queries.json";
import groundTruth from "./ground-truth.json";

export interface RetrievalResult {
  systemName: "System A (Keyword)" | "System B (Vector RAG)" | "System C (Entity Graph)" | "System D (Hybrid)";
  queryId: string;
  retrievedEntities: string[];
  retrievedFiles: string[];
  tokenCost: number;
}

export interface MetricEvaluation {
  systemName: string;
  top1Accuracy: number; // 0.0 - 1.0
  top5Recall: number;   // 0.0 - 1.0
  relevantFileRecall: number; // 0.0 - 1.0
  noiseRatio: number;   // 0.0 - 1.0
  nonKeywordEntityRecall: number; // 0.0 - 1.0 (PRIMARY METRIC)
  avgTokenCost: number;
}

export function evaluateSystemResults(
  systemName: string,
  results: RetrievalResult[]
): MetricEvaluation {
  let top1CorrectCount = 0;
  let totalTop5Recall = 0;
  let totalFileRecall = 0;
  let totalNoiseRatio = 0;
  let totalNonKeywordRecall = 0;
  let totalTokens = 0;

  const totalQueries = results.length;
  if (totalQueries === 0) {
    return {
      systemName,
      top1Accuracy: 0,
      top5Recall: 0,
      relevantFileRecall: 0,
      noiseRatio: 0,
      nonKeywordEntityRecall: 0,
      avgTokenCost: 0,
    };
  }

  for (const res of results) {
    const truth = (groundTruth as Record<string, any>)[res.queryId];
    if (!truth) continue;

    // 1. Top-1 Entity Accuracy
    if (res.retrievedEntities.length > 0 && res.retrievedEntities[0] === truth.top1Entity) {
      top1CorrectCount += 1;
    }

    // 2. Top-5 Entity Recall
    const top5Retrieved = res.retrievedEntities.slice(0, 5);
    const top5Matched = top5Retrieved.filter((e) => truth.relevantEntities.includes(e));
    const recallTop5 = truth.relevantEntities.length > 0 ? top5Matched.length / truth.relevantEntities.length : 0;
    totalTop5Recall += recallTop5;

    // 3. Relevant File Recall
    const filesMatched = res.retrievedFiles.filter((f) => truth.relevantFiles.includes(f));
    const fileRecall = truth.relevantFiles.length > 0 ? filesMatched.length / truth.relevantFiles.length : 0;
    totalFileRecall += fileRecall;

    // 4. Noise Ratio (Irrelevant retrieved / total retrieved)
    const irrelevantRetrieved = res.retrievedEntities.filter((e) => !truth.relevantEntities.includes(e));
    const noise = res.retrievedEntities.length > 0 ? irrelevantRetrieved.length / res.retrievedEntities.length : 0;
    totalNoiseRatio += noise;

    // 5. Non-Keyword Entity Recall (PRIMARY METRIC)
    const nonKeywordMatched = res.retrievedEntities.filter((e) => truth.nonKeywordEntities.includes(e));
    const nonKeywordRecall = truth.nonKeywordEntities.length > 0 ? nonKeywordMatched.length / truth.nonKeywordEntities.length : 0;
    totalNonKeywordRecall += nonKeywordRecall;

    // 6. Token Cost
    totalTokens += res.tokenCost;
  }

  return {
    systemName,
    top1Accuracy: top1CorrectCount / totalQueries,
    top5Recall: totalTop5Recall / totalQueries,
    relevantFileRecall: totalFileRecall / totalQueries,
    noiseRatio: totalNoiseRatio / totalQueries,
    nonKeywordEntityRecall: totalNonKeywordRecall / totalQueries,
    avgTokenCost: totalTokens / totalQueries,
  };
}

console.log(`[Benchmark Evaluator] Loaded ${queries.length} benchmark queries and ground-truth records.`);
