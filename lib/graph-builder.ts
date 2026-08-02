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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Patterns matching low-value or auxiliary files that should be filtered out
 * in high-level mode to reduce visual noise.
 */
function isLowValueFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();

  // Test and declaration files
  if (
    lower.endsWith(".test.ts") ||
    lower.endsWith(".test.tsx") ||
    lower.endsWith(".spec.ts") ||
    lower.endsWith(".spec.tsx") ||
    lower.endsWith(".test-d.ts") ||
    lower.endsWith(".d.ts")
  ) {
    return true;
  }

  // Files inside test/fixture directories
  const segments = lower.split("/");
  if (
    segments.some(
      (s) =>
        s === "__tests__" ||
        s === "test" ||
        s === "tests" ||
        s === "__specs__" ||
        s === "fixtures"
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Well-known entry-point and central configuration file names.
 * These are preserved as standalone file nodes even in high-level mode.
 */
const IMPORTANT_FILE_NAMES = new Set([
  "index.ts",
  "index.tsx",
  "main.ts",
  "main.tsx",
  "app.ts",
  "app.tsx",
  "cli.ts",
  "cli.tsx",
  "server.ts",
  "server.tsx",
  "config.ts",
  "config.tsx",
  "env.ts",
  "env.tsx",
  "page.tsx",
  "layout.tsx",
  "route.ts",
  "options.ts",
]);

function isImportantFile(filePath: string): boolean {
  const filename = filePath.split("/").pop()?.toLowerCase() || "";
  return IMPORTANT_FILE_NAMES.has(filename);
}

// ---------------------------------------------------------------------------
// Main Builder Function
// ---------------------------------------------------------------------------

/**
 * Builds nodes and edges for the dependency graph given a list of file paths.
 *
 * @param files List of TypeScript file paths in the repo
 * @param mode  "high-level" (collapsed folders & noise filtered) or "detailed" (all files)
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
    // 1. Filter out low-value (test, spec, .d.ts) files.
    // 2. Collapse regular files under the same top-level folder into a single folder node.
    // 3. Retain important files (index.ts, main.ts, page.tsx, etc.) as standalone file nodes.
    // -----------------------------------------------------------------------
    const filtered = files.filter((f) => !isLowValueFile(f));

    for (const filePath of filtered) {
      const relative = scopePrefix && filePath.startsWith(scopePrefix)
        ? filePath.slice(scopePrefix.length)
        : filePath;

      const segments = relative.split("/");

      if (segments.length > 1) {
        // File lives inside a folder
        const folderName = segments[0];
        const folderId = scopePrefix + folderName;

        // Ensure folder node exists
        if (!nodeMap.has(folderId)) {
          nodeMap.set(folderId, {
            id: folderId,
            label: folderName,
            type: "folder",
          });
        }

        // If file is an important entry point, render it as a standalone file node
        if (isImportantFile(filePath)) {
          if (!nodeMap.has(filePath)) {
            nodeMap.set(filePath, {
              id: filePath,
              label: segments[segments.length - 1],
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
            label: segments[0],
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
      const relative = scopePrefix && filePath.startsWith(scopePrefix)
        ? filePath.slice(scopePrefix.length)
        : filePath;

      const segments = relative.split("/");

      if (segments.length > 1) {
        const folderName = segments[0];
        const folderId = scopePrefix + folderName;

        if (!nodeMap.has(folderId)) {
          nodeMap.set(folderId, {
            id: folderId,
            label: folderName,
            type: "folder",
          });
        }

        if (!nodeMap.has(filePath)) {
          nodeMap.set(filePath, {
            id: filePath,
            label: segments[segments.length - 1],
            type: "file",
          });
        }

        addEdge(folderId, filePath);
      } else {
        if (!nodeMap.has(filePath)) {
          nodeMap.set(filePath, {
            id: filePath,
            label: segments[0],
            type: "file",
          });
        }
      }
    }
  }

  let nodes = Array.from(nodeMap.values());

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
