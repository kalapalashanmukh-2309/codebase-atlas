/**
 * lib/graph-builder.ts
 *
 * Entity-Level Code Graph builder for Codebase Atlas.
 * Parses file paths, file contents, and function indices into fine-grained entity nodes
 * (Files, Classes, Methods, Functions, Interfaces, Components, Variables) and typed
 * relationship edges (contains, calls, extends, implements, creates, imports, returns).
 * Supports four interactive graph lenses: "high-level", "detailed", "call-graph", "focused".
 */

import { type MonorepoInfo } from "./monorepo";
import { findLanguagePlugin, type EntityInfo } from "./language-plugins";
import { type FunctionIndexRecord } from "./ast-intel";

// ---------------------------------------------------------------------------
// Types & Schema Specification
// ---------------------------------------------------------------------------

export type GraphMode = "high-level" | "detailed" | "call-graph" | "focused";

export type NodeType =
  | "repository"
  | "workspace"
  | "folder"
  | "file"
  | "class"
  | "interface"
  | "function"
  | "method"
  | "variable"
  | "constant"
  | "component";

export type RelationshipType =
  | "contains"
  | "imports"
  | "exports"
  | "calls"
  | "extends"
  | "implements"
  | "uses"
  | "reads"
  | "writes"
  | "creates"
  | "returns"
  | "references";

export interface CodeNode {
  id: string;
  name: string;
  label: string;
  type: NodeType;
  path: string;
  parentId?: string;
  startLine?: number;
  endLine?: number;
  language?: string;
  isImportant?: boolean;
  isLowValue?: boolean;
  semantic?: {
    domains?: string[];
    features?: string[];
    concepts?: string[];
    confidence?: number;
  };
}

export interface CodeEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  label?: string;
  resolution?: {
    status: "verified" | "inferred" | "unresolved";
    method: "ast" | "symbol-resolution" | "type-resolution";
  };
  evidence?: {
    file: string;
    lineStart: number;
    lineEnd: number;
    sourceSnippet?: string;
  };
  // Backward compatibility fields for react-force-graph
  from: string;
  to: string;
}

export interface TransitiveRelevance {
  entityId: string;
  seedEntityId: string;
  distance: number;
  path: string[];
}

/**
 * Traverses graph relationships up to maxDistance hops to track transitive relevance paths.
 */
export function traverseTransitiveNeighborhood(
  graph: BuiltGraph,
  seedEntityIds: string[],
  maxDistance = 2
): TransitiveRelevance[] {
  const result: TransitiveRelevance[] = [];
  const visited = new Map<string, { distance: number; path: string[]; seed: string }>();

  for (const seedId of seedEntityIds) {
    const found = graph.nodes.find((n) => n.id === seedId || n.path === seedId);
    const targetId = found ? found.id : seedId;
    visited.set(targetId, { distance: 0, path: [targetId], seed: targetId });
  }

  let currentLevel = Array.from(visited.keys());

  for (let dist = 1; dist <= maxDistance; dist++) {
    const nextLevel: string[] = [];

    for (const sourceId of currentLevel) {
      const sourceState = visited.get(sourceId)!;

      for (const edge of graph.edges) {
        let neighborId: string | null = null;
        if (edge.source === sourceId) neighborId = edge.target;
        else if (edge.target === sourceId) neighborId = edge.source;

        if (neighborId && !visited.has(neighborId)) {
          const path = [...sourceState.path, neighborId];
          visited.set(neighborId, { distance: dist, path, seed: sourceState.seed });
          nextLevel.push(neighborId);
        }
      }
    }

    currentLevel = nextLevel;
  }

  for (const [entityId, info] of visited.entries()) {
    result.push({
      entityId,
      seedEntityId: info.seed,
      distance: info.distance,
      path: info.path,
    });
  }

  return result;
}

// Backward compatibility type aliases
export type GraphNode = CodeNode;
export type GraphEdge = CodeEdge;

export interface BuiltGraph {
  nodes: CodeNode[];
  edges: CodeEdge[];
}

export type FileItemInput = string | { path: string; content?: string };

// ---------------------------------------------------------------------------
// Constants & Base Name Lists
// ---------------------------------------------------------------------------

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

const LOW_VALUE_DEEP_MODULE_NAMES = new Set([
  "utils",
  "helpers",
  "types",
  "constants",
]);

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

export function getTopLevelFolder(filePath: string, scopePrefix = ""): string | null {
  const relative =
    scopePrefix && filePath.startsWith(scopePrefix)
      ? filePath.slice(scopePrefix.length)
      : filePath;
  const segments = relative.split("/");
  return segments.length > 1 ? segments[0] : null;
}

export function isImportantFile(filePath: string, scopePrefix = ""): boolean {
  const relative =
    scopePrefix && filePath.startsWith(scopePrefix)
      ? filePath.slice(scopePrefix.length)
      : filePath;
  const segments = relative.split("/");
  const filename = segments[segments.length - 1];
  const baseName = filename.replace(/\.(tsx?|jsx?|mjs|cjs|d\.ts)$/, "").toLowerCase();

  if (IMPORTANT_BASE_NAMES.has(baseName)) {
    return true;
  }
  if (baseName === "index" && segments.length === 1) {
    return true;
  }
  return false;
}

export function isLowValueFile(filePath: string, scopePrefix = ""): boolean {
  const lower = filePath.toLowerCase();
  const relative =
    scopePrefix && filePath.startsWith(scopePrefix)
      ? filePath.slice(scopePrefix.length)
      : filePath;
  const segments = relative.split("/");
  const filename = segments[segments.length - 1];
  const baseName = filename.replace(/\.(tsx?|jsx?|mjs|cjs|d\.ts)$/, "").toLowerCase();

  if (
    lower.includes(".test.") ||
    lower.includes(".spec.") ||
    lower.endsWith(".test-d.ts")
  ) {
    return true;
  }

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

  if (lower.endsWith(".d.ts")) {
    return true;
  }

  if (LOW_VALUE_DEEP_MODULE_NAMES.has(baseName) && segments.length >= 3) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Main Entity-Level Graph Builder
// ---------------------------------------------------------------------------

export function buildGraph(
  filesInput: FileItemInput[],
  mode: GraphMode = "high-level",
  monorepoInfo?: MonorepoInfo,
  functionIndex?: FunctionIndexRecord,
  focusFiles?: string[]
): BuiltGraph {
  const rawFilePaths = filesInput.map((f) => (typeof f === "string" ? f : f.path));
  const fileContentMap = new Map<string, string>();
  for (const f of filesInput) {
    if (typeof f !== "string" && f.content) {
      fileContentMap.set(f.path, f.content);
    }
  }

  const nodeMap = new Map<string, CodeNode>();
  const edgeMap = new Map<string, CodeEdge>();

  function addNode(node: CodeNode) {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
    }
  }

  function addEdge(source: string, target: string, type: RelationshipType, label?: string) {
    if (source === target) return;
    const edgeId = `${source}-[${type}]->${target}`;
    if (!edgeMap.has(edgeId)) {
      edgeMap.set(edgeId, {
        id: edgeId,
        source,
        target,
        from: source,
        to: target,
        type,
        label: label || type,
      });
    }
  }

  const hasSrc = rawFilePaths.some((f) => f.startsWith("src/"));
  const scopePrefix = hasSrc ? "src/" : "";

  // 1. Workspace / Folder structure base
  if (monorepoInfo?.isMonorepo && monorepoInfo.workspaces && monorepoInfo.workspaces.length > 0) {
    const activeWorkspaces = mode === "high-level"
      ? monorepoInfo.workspaces.filter((w) => w.files.length > 0)
      : monorepoInfo.workspaces;

    const targetWorkspaces = activeWorkspaces.length > 0 ? activeWorkspaces : monorepoInfo.workspaces.slice(0, 15);

    for (const ws of targetWorkspaces) {
      const wsId = `workspace:${ws.path}`;
      const shortName = ws.name.replace(/^(packages|apps|modules|services|libs|projects)\//i, "");
      addNode({
        id: wsId,
        name: shortName,
        label: `📦 ${shortName}`,
        type: "workspace",
        path: ws.path,
      });
    }
  }

  // 2. High-Level Mode Lens (Folder / File architecture overview)
  if (mode === "high-level") {
    const filteredFiles = rawFilePaths.filter((f) => !isLowValueFile(f, scopePrefix));

    for (const filePath of filteredFiles) {
      const topFolder = getTopLevelFolder(filePath, scopePrefix);
      const relative = scopePrefix && filePath.startsWith(scopePrefix) ? filePath.slice(scopePrefix.length) : filePath;
      const filename = relative.split("/").pop() || filePath;

      let fileParentId: string | undefined = undefined;

      if (topFolder !== null) {
        const folderId = scopePrefix + topFolder;
        fileParentId = folderId;
        addNode({
          id: folderId,
          name: topFolder,
          label: topFolder,
          type: "folder",
          path: folderId,
        });

        if (isImportantFile(filePath, scopePrefix)) {
          addNode({
            id: filePath,
            name: filename,
            label: filename,
            type: "file",
            path: filePath,
            parentId: folderId,
            isImportant: true,
            isLowValue: false,
          });
          addEdge(folderId, filePath, "contains");
        }
      } else {
        addNode({
          id: filePath,
          name: filename,
          label: filename,
          type: "file",
          path: filePath,
          isImportant: isImportantFile(filePath, scopePrefix),
          isLowValue: false,
        });
      }
    }

    const nodes = Array.from(nodeMap.values());
    const edges = Array.from(edgeMap.values());
    if (nodes.length === 0 && rawFilePaths.length > 0) {
      return buildGraph(filesInput, "detailed", monorepoInfo, functionIndex, focusFiles);
    }
    return { nodes, edges };
  }

  // 3. Detailed / Call-Graph / Focused Lenses: Extract AST entities
  for (const filePath of rawFilePaths) {
    const topFolder = getTopLevelFolder(filePath, scopePrefix);
    const relative = scopePrefix && filePath.startsWith(scopePrefix) ? filePath.slice(scopePrefix.length) : filePath;
    const filename = relative.split("/").pop() || filePath;

    let folderId: string | undefined;
    if (topFolder !== null) {
      folderId = scopePrefix + topFolder;
      addNode({
        id: folderId,
        name: topFolder,
        label: topFolder,
        type: "folder",
        path: folderId,
      });
    }

    // Always create File container node
    addNode({
      id: filePath,
      name: filename,
      label: filename,
      type: "file",
      path: filePath,
      parentId: folderId,
      isImportant: isImportantFile(filePath, scopePrefix),
      isLowValue: isLowValueFile(filePath, scopePrefix),
    });

    if (folderId) {
      addEdge(folderId, filePath, "contains");
    }

    // Extract Entities using Language Plugin if content exists
    const content = fileContentMap.get(filePath);
    let extractedEntities: EntityInfo[] = [];

    if (content) {
      const plugin = findLanguagePlugin(filePath);
      if (plugin?.extractEntities) {
        extractedEntities = plugin.extractEntities({ path: filePath, content });
      }
    }

    // Process extracted entities for detailed mode
    if (extractedEntities.length > 0) {
      for (const entity of extractedEntities) {
        const entityId = `${filePath}::${entity.parentEntityName ? entity.parentEntityName + "." : ""}${entity.name}`;
        const parentId = entity.parentEntityName
          ? `${filePath}::${entity.parentEntityName}`
          : filePath;

        let icon = "⚡";
        if (entity.type === "class") icon = "🟣";
        else if (entity.type === "interface") icon = "🔷";
        else if (entity.type === "function") icon = "🔵";
        else if (entity.type === "component") icon = "🧱";

        addNode({
          id: entityId,
          name: entity.name,
          label: `${icon} ${entity.name}`,
          type: entity.type,
          path: filePath,
          parentId,
          startLine: entity.lineStart,
          endLine: entity.lineEnd,
        });

        // Entity hierarchy edge (File contains Entity, or Class contains Method)
        addEdge(parentId, entityId, "contains");

        // Relationships: extends, implements
        if (entity.extendsNames) {
          for (const ext of entity.extendsNames) {
            const targetId = `${filePath}::${ext}`;
            addEdge(entityId, targetId, "extends");
          }
        }
        if (entity.implementsNames) {
          for (const impl of entity.implementsNames) {
            const targetId = `${filePath}::${impl}`;
            addEdge(entityId, targetId, "implements");
          }
        }

        // Relationships: creates
        if (entity.creates) {
          for (const cr of entity.creates) {
            const targetId = `${filePath}::${cr.targetName}`;
            addEdge(entityId, targetId, "creates");
          }
        }

        // Relationships: calls
        if (entity.calls) {
          for (const call of entity.calls) {
            const targetId = `${filePath}::${call.calleeName}`;
            addEdge(entityId, targetId, "calls");
          }
        }
      }
    }
  }

  // Cross-file symbol resolution for CALLS, CREATES, and EXTENDS edges
  for (const edge of Array.from(edgeMap.values())) {
    if (!nodeMap.has(edge.target)) {
      const targetSymbol = edge.target.split("::").pop();
      if (targetSymbol) {
        const matchingNode = Array.from(nodeMap.values()).find(
          (n) => n.name === targetSymbol && n.id !== edge.source
        );
        if (matchingNode) {
          edgeMap.delete(edge.id);
          const newEdgeId = `${edge.source}-[${edge.type}]->${matchingNode.id}`;
          edgeMap.set(newEdgeId, {
            ...edge,
            id: newEdgeId,
            target: matchingNode.id,
            to: matchingNode.id,
          });
        }
      }
    }
  }

  // 4. Incorporate Function Index for Call Graphs & Cross-file Call Edges
  if (functionIndex) {
    for (const [funcName, record] of Object.entries(functionIndex)) {
      for (const def of record.definitions) {
        const entityId = `${def.file}::${funcName}`;
        if (!nodeMap.has(entityId)) {
          addNode({
            id: entityId,
            name: funcName,
            label: `🔵 ${funcName}()`,
            type: "function",
            path: def.file,
            parentId: def.file,
            startLine: def.lineStart,
            endLine: def.lineEnd,
          });
          addEdge(def.file, entityId, "contains");
        }
      }

      for (const site of record.callSites) {
        if (site.callerFunction) {
          const callerId = `${site.file}::${site.callerFunction}`;
          const targetId = `${site.file}::${funcName}`;
          if (nodeMap.has(callerId) && nodeMap.has(targetId)) {
            addEdge(callerId, targetId, "calls");
          }
        }
      }
    }
  }

  // 5. Filter for Call-Graph Lens
  if (mode === "call-graph") {
    const callGraphNodes = new Map<string, CodeNode>();
    const callGraphEdges: CodeEdge[] = [];

    for (const [id, node] of nodeMap.entries()) {
      if (node.type === "function" || node.type === "method" || node.type === "component") {
        callGraphNodes.set(id, node);
      }
    }

    for (const edge of edgeMap.values()) {
      if (edge.type === "calls" && callGraphNodes.has(edge.source) && callGraphNodes.has(edge.target)) {
        callGraphEdges.push(edge);
      }
    }

    // If call graph has nodes, return call graph lens
    if (callGraphNodes.size > 0) {
      return {
        nodes: Array.from(callGraphNodes.values()),
        edges: callGraphEdges,
      };
    }
  }

  // 6. Focused Lens Subgraph
  if (mode === "focused" && focusFiles && focusFiles.length > 0) {
    const focusSet = new Set<string>();

    for (const ff of focusFiles) {
      const lower = ff.toLowerCase();
      for (const [id, node] of nodeMap.entries()) {
        if (id.toLowerCase().includes(lower) || node.path.toLowerCase().includes(lower)) {
          focusSet.add(id);
        }
      }
    }

    // 1-hop & 2-hop neighborhood expansion
    const expandedNodes = new Map<string, CodeNode>();
    const expandedEdges: CodeEdge[] = [];

    for (const edge of edgeMap.values()) {
      if (focusSet.has(edge.source) || focusSet.has(edge.target)) {
        if (nodeMap.has(edge.source)) expandedNodes.set(edge.source, nodeMap.get(edge.source)!);
        if (nodeMap.has(edge.target)) expandedNodes.set(edge.target, nodeMap.get(edge.target)!);
        expandedEdges.push(edge);
      }
    }

    if (expandedNodes.size > 0) {
      return {
        nodes: Array.from(expandedNodes.values()),
        edges: expandedEdges,
      };
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

export function buildFocusSubgraph(
  allFiles: string[],
  focusFiles: string[]
): BuiltGraph {
  return buildGraph(allFiles, "focused", undefined, undefined, focusFiles);
}
