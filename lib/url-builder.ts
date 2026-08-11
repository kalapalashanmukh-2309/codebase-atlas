/**
 * lib/url-builder.ts
 *
 * Helper utilities for encoding, normalizing, and parsing repository view state
 * (graph mode, focused files, line ranges) into stable URL search parameters.
 */

import type { GraphMode } from "./graph-builder";

export interface RepoViewState {
  graphMode?: GraphMode;
  focusFile?: string | null;
  focusFiles?: string[];
  lines?: string | null;
  doc?: string | null;
  func?: string | null;
}

export interface ParsedRepoViewState {
  repoUrl: string | null;
  graphMode: GraphMode;
  focusFile: string | null;
  focusFiles: string[];
  lines: string | null;
  doc: string | null;
  func: string | null;
}

/**
 * Normalizes repository view state params to produce stable, clean URL search params:
 * - url is always present and trimmed.
 * - Omits default graphMode ("high-level") to keep URLs clean; includes "graph=detailed" only when active.
 * - Deduplicates, trims, and alphabetically sorts focusFiles array.
 * - Encodes focusFile, focusFiles, and lines range parameters.
 */
export function normalizeRepoQuery(repoUrl: string, state?: RepoViewState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("url", repoUrl.trim());

  // 1. Omit default "high-level" graph mode; set "graph" parameter if non-default
  if (state?.graphMode && state.graphMode !== "high-level") {
    params.set("graph", state.graphMode);
  }

  // 2. Single focus file
  if (state?.focusFile && state.focusFile.trim().length > 0) {
    params.set("focusFile", state.focusFile.trim());
  }

  // 3. Deduplicate, trim, and sort focusFiles array
  if (state?.focusFiles && state.focusFiles.length > 0) {
    const cleaned = Array.from(
      new Set(
        state.focusFiles
          .map((f) => f.trim())
          .filter((f) => f.length > 0)
      )
    ).sort();

    if (cleaned.length > 0) {
      params.set("focusFiles", cleaned.join(","));
    }
  }

  // 4. Line range parameter (e.g. "10-22")
  if (state?.lines && state.lines.trim().length > 0) {
    params.set("lines", state.lines.trim());
  }

  // 5. Living doc slug parameter (e.g. "auth-flow")
  if (state?.doc && state.doc.trim().length > 0) {
    params.set("doc", state.doc.trim());
  }

  // 6. Function symbol parameter (e.g. "parseArgs")
  if (state?.func && state.func.trim().length > 0) {
    params.set("func", state.func.trim());
  }

  return params;
}

/**
 * Builds a normalized /repo URL encoding the repository target and view state.
 */
export function buildRepoUrl(repoUrl: string, state?: RepoViewState): string {
  const params = normalizeRepoQuery(repoUrl, state);
  return `/repo?${params.toString()}`;
}

/**
 * Safely parses and validates repository view state from URL search parameters,
 * falling back to safe defaults ("high-level", no focus) if parameters are missing
 * or invalid.
 */
export function parseRepoViewState(
  searchParams: { get: (key: string) => string | null }
): ParsedRepoViewState {
  const rawUrl = searchParams.get("url");
  const repoUrl = rawUrl ? decodeURIComponent(rawUrl.trim()) : null;

  // 1. Validate graph mode ("high-level" | "detailed" | "call-graph" | "focused")
  const rawGraph = searchParams.get("graph");
  const validModes = new Set<GraphMode>(["high-level", "detailed", "call-graph", "focused"]);
  const graphMode: GraphMode =
    rawGraph && validModes.has(rawGraph as GraphMode) ? (rawGraph as GraphMode) : "high-level";

  // 2. Validate single focusFile
  const rawFocusFile = searchParams.get("focusFile");
  const focusFile =
    rawFocusFile && rawFocusFile.trim()
      ? decodeURIComponent(rawFocusFile.trim())
      : null;

  // 3. Validate comma-separated focusFiles
  const rawFocusFiles = searchParams.get("focusFiles");
  const focusFiles = rawFocusFiles
    ? Array.from(
        new Set(
          rawFocusFiles
            .split(",")
            .map((f) => decodeURIComponent(f.trim()))
            .filter((f) => f.length > 0)
        )
      ).sort()
    : [];

  // 4. Validate line range parameter (e.g. "10-22")
  const rawLines = searchParams.get("lines");
  const lines = rawLines && rawLines.trim() ? decodeURIComponent(rawLines.trim()) : null;

  // 5. Validate doc slug parameter (e.g. "auth-flow")
  const rawDoc = searchParams.get("doc");
  const doc = rawDoc && rawDoc.trim() ? decodeURIComponent(rawDoc.trim()) : null;

  // 6. Validate func / function symbol parameter (e.g. "parseArgs")
  const rawFunc = searchParams.get("func") || searchParams.get("function");
  const func = rawFunc && rawFunc.trim() ? decodeURIComponent(rawFunc.trim()) : null;

  return {
    repoUrl,
    graphMode,
    focusFile,
    focusFiles,
    lines,
    doc,
    func,
  };
}
