/**
 * lib/graph-builder.ts
 *
 * Graph builder helper for Codebase Atlas.
 * Transforms a list of TypeScript file paths into node and edge structures
 * for the interactive force graph in either "high-level" or "detailed" mode.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GraphMode = "high-level" | "detailed";

export interface GraphNode {
  id: string;
  label: string;
  type: "file" | "folder";
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

  // Base name without extensions (e.g. "index.ts" -> "index", "route.ts" -> "route")
  const baseName = filename.replace(/\.(tsx?|jsx?|d\.ts)$/, "").toLowerCase();

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
  const baseName = filename.replace(/\.(tsx?|jsx?|d\.ts)$/, "").toLowerCase();

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
 *
 * @param files List of TypeScript file paths in the repo
 * @param mode  "high-level" (folder collapsing & noise reduction) or "detailed" (all files)
 */
export function buildGraph(files: string[], mode: GraphMode): BuiltGraph {
  // Determine scope prefix: "src/" if src exists in paths, otherwise ""
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
    // -----------------------------------------------------------------------
    // HIGH-LEVEL MODE:
    // 1. Filter out low-value files (tests, .d.ts, deep utils).
    // 2. Collapse non-important files under the same top-level folder into a folder node.
    // 3. Keep important files (index, main, app, cli, etc.) as standalone file nodes.
    // -----------------------------------------------------------------------
    const filtered = files.filter((f) => !isLowValueFile(f, scopePrefix));

    for (const filePath of filtered) {
      const topFolder = getTopLevelFolder(filePath, scopePrefix);
      const relative =
        scopePrefix && filePath.startsWith(scopePrefix)
          ? filePath.slice(scopePrefix.length)
          : filePath;
      const filename = relative.split("/").pop() || "";

      if (topFolder !== null) {
        // File lives inside a folder
        const folderId = scopePrefix + topFolder;

        // Create folder node for the top-level directory
        if (!nodeMap.has(folderId)) {
          nodeMap.set(folderId, {
            id: folderId,
            label: topFolder,
            type: "folder",
          });
        }

        // If file is important, render it as a standalone file node linked to the folder
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
        // Non-important files are collapsed into the folder node (no file node added)
      } else {
        // Root-level file
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
    // -----------------------------------------------------------------------
    // DETAILED MODE:
    // Render all files as individual file nodes and link them to their folders.
    // -----------------------------------------------------------------------
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

  // Fallback: If high-level mode filtered out all files, fall back to detailed mode
  if (mode === "high-level" && nodes.length === 0 && files.length > 0) {
    return buildGraph(files, "detailed");
  }

  // Debug log node and edge counts
  console.log(
    `[lib/graph-builder] Mode: "${mode}" | Total input files: ${files.length} => Nodes: ${nodes.length}, Edges: ${edges.length}`
  );

  return { nodes, edges };
}
