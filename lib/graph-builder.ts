/**
 * lib/graph-builder.ts
 *
 * Graph builder helper for Codebase Atlas.
 * Transforms a list of TypeScript file paths into node and edge structures
 * for the interactive force graph in either "high-level" or "detailed" mode.
 * Supports monorepo workspace-level grouping and flow subgraphs.
 */

import { type MonorepoInfo } from "./monorepo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GraphMode = "high-level" | "detailed";

export interface GraphNode {
  id: string;
  label: string;
  type: "file" | "folder" | "workspace";
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface BuiltGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ---------------------------------------------------------------------------
// Base Name Lists & Constants
// ---------------------------------------------------------------------------

/**
 * Base filenames (without extensions) considered central entry points.
 * In high-level mode, these are always preserved as standalone file nodes.
 */
const IMPORTANT_BASE_NAMES = new Set([
  "index",
  "main",
  "app",
  "cli",
  "server",
  "config",
  "env",
  "router",
  "store",
  "page",
  "layout",
  "route",
  "options",
  "utils",
  "helper",
  "helpers",
]);

/**
 * Deep utility module names that introduce visual noise when located deep
 * in the directory tree (depth >= 3).
 */
const LOW_VALUE_DEEP_MODULE_NAMES = new Set([
  "utils",
  "helpers",
  "types",
  "constants",
]);

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Returns the top-level folder name relative to scope (e.g., "components", "routes"),
 * or null if the file is at the scope root level.
 */
export function getTopLevelFolder(filePath: string, scopePrefix = ""): string | null {
  const relative =
    scopePrefix && filePath.startsWith(scopePrefix)
      ? filePath.slice(scopePrefix.length)
      : filePath;
  const segments = relative.split("/");
  return segments.length > 1 ? segments[0] : null;
}

/**
 * RATIONALE for Important Files:
 * Keeps core entry points, routing, app setup, state stores, CLI tools, and config
 * modules visible as individual nodes even in high-level mode, allowing developers
 * to quickly locate key architectural anchors.
 */
export function isImportantFile(filePath: string, scopePrefix = ""): boolean {
  const relative =
    scopePrefix && filePath.startsWith(scopePrefix)
      ? filePath.slice(scopePrefix.length)
      : filePath;
  const segments = relative.split("/");
  const filename = segments[segments.length - 1];

  // Base name without extensions (e.g. "index.js" -> "index", "route.ts" -> "route")
  const baseName = filename.replace(/\.(tsx?|jsx?|mjs|cjs|d\.ts)$/, "").toLowerCase();

  if (IMPORTANT_BASE_NAMES.has(baseName)) {
    return true;
  }

  // Additional Rule: index.* directly under src/ or repo root is always important
  if (baseName === "index" && segments.length === 1) {
    return true;
  }

  return false;
}

/**
 * RATIONALE for Low-Value Files:
 * Test files, type declaration files, and deeply nested utility/type modules
 * produce significant visual clutter without adding architectural insight.
 * Filtering them in high-level mode creates a clean topology focused on core modules.
 */
export function isLowValueFile(filePath: string, scopePrefix = ""): boolean {
  const lower = filePath.toLowerCase();
  const relative =
    scopePrefix && filePath.startsWith(scopePrefix)
      ? filePath.slice(scopePrefix.length)
      : filePath;
  const segments = relative.split("/");
  const filename = segments[segments.length - 1];
  const baseName = filename.replace(/\.(tsx?|jsx?|mjs|cjs|d\.ts)$/, "").toLowerCase();

  // 1. Test files (e.g. *.test.ts, *.spec.tsx, index.test-d.ts)
  if (
    lower.includes(".test.") ||
    lower.includes(".spec.") ||
    lower.endsWith(".test-d.ts")
  ) {
    return true;
  }

  // Files in test/fixture directories (e.g., test/, tests/, __tests__/)
  if (
    segments.some(
      (s) =>
        s === "test" ||
        s === "tests" ||
        s === "__tests__" ||
        s === "spec" ||
        s === "specs" ||
        s === "fixtures"
    )
  ) {
    return true;
  }

  // 2. Type declaration files (*.d.ts)
  if (lower.endsWith(".d.ts")) {
    return true;
  }

  // 3. Deep utility/helper/type/constant files (depth >= 3, e.g. src/components/foo/utils.ts)
  if (
    LOW_VALUE_DEEP_MODULE_NAMES.has(baseName) &&
    segments.length >= 3
  ) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Main Builder Function
// ---------------------------------------------------------------------------

/**
 * Builds nodes and edges for the dependency graph given a list of file paths.
 * Supports monorepo workspace-level grouping when monorepoInfo is provided.
 *
 * @param files List of TypeScript file paths in the repo
 * @param mode  "high-level" (folder/workspace collapsing & noise reduction) or "detailed"
 * @param monorepoInfo Monorepo info containing workspaces if detected
 */
export function buildGraph(
  files: string[],
  mode: GraphMode,
  monorepoInfo?: MonorepoInfo
): BuiltGraph {
  // If repository is a monorepo, structure nodes and edges by workspace
  if (monorepoInfo?.isMonorepo && monorepoInfo.workspaces && monorepoInfo.workspaces.length > 0) {
    const nodeMap = new Map<string, GraphNode>();
    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    function addEdge(from: string, to: string) {
      const key = `${from}->${to}`;
      if (!edgeSet.has(key) && from !== to) {
        edgeSet.add(key);
        edges.push({ from, to });
      }
    }

    // Create a node for each workspace
    for (const ws of monorepoInfo.workspaces) {
      const wsId = `workspace:${ws.path}`;
      nodeMap.set(wsId, {
        id: wsId,
        label: `📦 ${ws.name}`,
        type: "workspace",
      });
    }

    if (mode === "high-level") {
      // High-level: Show workspace nodes + key entry files per workspace
      for (const ws of monorepoInfo.workspaces) {
        const wsId = `workspace:${ws.path}`;
        const keyFiles = ws.files.filter(
          (f) =>
            isImportantFile(f) ||
            f.endsWith("/index.ts") ||
            f.endsWith("/index.tsx") ||
            f.endsWith("/main.ts")
        );
        const displayFiles = keyFiles.length > 0 ? keyFiles.slice(0, 3) : ws.files.slice(0, 2);

        for (const filePath of displayFiles) {
          const filename = filePath.split("/").pop() || filePath;
          if (!nodeMap.has(filePath)) {
            nodeMap.set(filePath, {
              id: filePath,
              label: filename,
              type: "file",
            });
          }
          addEdge(wsId, filePath);
        }
      }
    } else {
      // Detailed: Show workspace nodes + member file nodes
      for (const ws of monorepoInfo.workspaces) {
        const wsId = `workspace:${ws.path}`;
        for (const filePath of ws.files) {
          const filename = filePath.split("/").pop() || filePath;
          if (!nodeMap.has(filePath)) {
            nodeMap.set(filePath, {
              id: filePath,
              label: filename,
              type: "file",
            });
          }
          addEdge(wsId, filePath);
        }
      }
    }

    // Inter-workspace edges between consecutive workspaces
    const wsIds = monorepoInfo.workspaces.map((w) => `workspace:${w.path}`);
    for (let i = 0; i < wsIds.length - 1; i++) {
      addEdge(wsIds[i], wsIds[i + 1]);
    }

    const nodes = Array.from(nodeMap.values());
    console.log(
      `[lib/graph-builder] Monorepo Mode: "${mode}" | Workspaces: ${monorepoInfo.workspaces.length} => Nodes: ${nodes.length}, Edges: ${edges.length}`
    );
    return { nodes, edges };
  }

  // --- Standard single-package repo graph building ---
  const hasSrc = files.some((f) => f.startsWith("src/"));
  const scopePrefix = hasSrc ? "src/" : "";

  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  function addEdge(from: string, to: string) {
    const key = `${from}->${to}`;
    if (!edgeSet.has(key) && from !== to) {
      edgeSet.add(key);
      edges.push({ from, to });
    }
  }

  if (mode === "high-level") {
    const filtered = files.filter((f) => !isLowValueFile(f, scopePrefix));

    for (const filePath of filtered) {
      const topFolder = getTopLevelFolder(filePath, scopePrefix);
      const relative =
        scopePrefix && filePath.startsWith(scopePrefix)
          ? filePath.slice(scopePrefix.length)
          : filePath;
      const filename = relative.split("/").pop() || "";

      if (topFolder !== null) {
        const folderId = scopePrefix + topFolder;

        if (!nodeMap.has(folderId)) {
          nodeMap.set(folderId, {
            id: folderId,
            label: topFolder,
            type: "folder",
          });
        }

        if (isImportantFile(filePath, scopePrefix)) {
          if (!nodeMap.has(filePath)) {
            nodeMap.set(filePath, {
              id: filePath,
              label: filename,
              type: "file",
            });
          }
          addEdge(folderId, filePath);
        }
      } else {
        if (!nodeMap.has(filePath)) {
          nodeMap.set(filePath, {
            id: filePath,
            label: filename,
            type: "file",
          });
        }
      }
    }
  } else {
    for (const filePath of files) {
      const topFolder = getTopLevelFolder(filePath, scopePrefix);
      const relative =
        scopePrefix && filePath.startsWith(scopePrefix)
          ? filePath.slice(scopePrefix.length)
          : filePath;
      const filename = relative.split("/").pop() || "";

      if (topFolder !== null) {
        const folderId = scopePrefix + topFolder;

        if (!nodeMap.has(folderId)) {
          nodeMap.set(folderId, {
            id: folderId,
            label: topFolder,
            type: "folder",
          });
        }

        if (!nodeMap.has(filePath)) {
          nodeMap.set(filePath, {
            id: filePath,
            label: filename,
            type: "file",
          });
        }

        addEdge(folderId, filePath);
      } else {
        if (!nodeMap.has(filePath)) {
          nodeMap.set(filePath, {
            id: filePath,
            label: filename,
            type: "file",
          });
        }
      }
    }
  }

  const nodes = Array.from(nodeMap.values());

  if (mode === "high-level" && nodes.length === 0 && files.length > 0) {
    return buildGraph(files, "detailed", monorepoInfo);
  }

  console.log(
    `[lib/graph-builder] Mode: "${mode}" | Total input files: ${files.length} => Nodes: ${nodes.length}, Edges: ${edges.length}`
  );

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Focused Subgraph Builder
// ---------------------------------------------------------------------------

/**
 * Builds a small, isolated subgraph containing only the specified focus files
 * and their parent folders / connecting edges.
 */
export function buildFocusSubgraph(
  allFiles: string[],
  focusFiles: string[]
): BuiltGraph {
  if (!focusFiles || focusFiles.length === 0) {
    return { nodes: [], edges: [] };
  }

  const hasSrc = allFiles.some((f) => f.startsWith("src/"));
  const scopePrefix = hasSrc ? "src/" : "";

  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  function addEdge(from: string, to: string) {
    const key = `${from}->${to}`;
    if (!edgeSet.has(key) && from !== to) {
      edgeSet.add(key);
      edges.push({ from, to });
    }
  }

  const matchedFocusFiles = allFiles.filter((filePath) => {
    const lowerPath = filePath.toLowerCase();
    return focusFiles.some((ff) => {
      const lowerFf = ff.toLowerCase();
      return lowerPath === lowerFf || lowerPath.endsWith(lowerFf) || lowerFf.endsWith(lowerPath);
    });
  });

  const targetFileList = matchedFocusFiles.length > 0 ? matchedFocusFiles : focusFiles;

  for (const filePath of targetFileList) {
    const topFolder = getTopLevelFolder(filePath, scopePrefix);
    const relative =
      scopePrefix && filePath.startsWith(scopePrefix)
        ? filePath.slice(scopePrefix.length)
        : filePath;
    const filename = relative.split("/").pop() || filePath;

    if (topFolder !== null) {
      const folderId = scopePrefix + topFolder;
      if (!nodeMap.has(folderId)) {
        nodeMap.set(folderId, {
          id: folderId,
          label: topFolder,
          type: "folder",
        });
      }

      if (!nodeMap.has(filePath)) {
        nodeMap.set(filePath, {
          id: filePath,
          label: filename,
          type: "file",
        });
      }

      addEdge(folderId, filePath);
    } else {
      if (!nodeMap.has(filePath)) {
        nodeMap.set(filePath, {
          id: filePath,
          label: filename,
          type: "file",
        });
      }
    }
  }

  // Interconnect focus file nodes sequentially to indicate flow
  const fileNodeIds = Array.from(nodeMap.values())
    .filter((n) => n.type === "file")
    .map((n) => n.id);

  for (let i = 0; i < fileNodeIds.length - 1; i++) {
    addEdge(fileNodeIds[i], fileNodeIds[i + 1]);
  }

  const nodes = Array.from(nodeMap.values());
  return { nodes, edges };
}
