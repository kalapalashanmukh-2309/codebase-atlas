/**
 * lib/github.ts
 *
 * Utilities for interacting with the GitHub REST API and building
 * a basic dependency graph from a repository's file tree.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GraphNode = { id: string; label: string; type: "file" | "folder" };
export type GraphEdge = { from: string; to: string };

export interface RepoGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AnalyzeResult {
  overview: string;
  files: string[];
  graph: RepoGraph;
}

/** Shape of a single item returned by the GitHub Git Trees API. */
interface GitTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

/** Response shape from GET /repos/:owner/:repo/git/trees/:sha?recursive=1 */
interface GitTreeResponse {
  sha: string;
  url: string;
  tree: GitTreeItem[];
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

/**
 * Extract the `owner` and `repo` from a GitHub URL.
 * Handles forms like:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/main/src
 *   http://github.com/owner/repo.git
 *
 * Throws if the URL doesn't look like a valid GitHub repo URL.
 */
export function parseGitHubUrl(raw: string): { owner: string; repo: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }

  if (!url.hostname.endsWith("github.com")) {
    throw new Error("URL must be a github.com URL.");
  }

  // pathname looks like "/owner/repo/..." — split and grab first two parts
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(
      "URL must include owner and repo, e.g. https://github.com/owner/repo"
    );
  }

  const owner = parts[0];
  // Strip a trailing ".git" if present
  const repo = parts[1].replace(/\.git$/, "");

  return { owner, repo };
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

/**
 * Build the common headers for GitHub API requests.
 * If GITHUB_TOKEN is set in the environment, it is included as a Bearer
 * token — this raises the rate limit from 60 to 5,000 requests per hour.
 */
function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "codebase-atlas",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch the full file tree for a repo using the Git Trees API.
 * Uses the default branch (fetched via /repos/:owner/:repo first).
 *
 * This is a single-request alternative to recursively calling /contents,
 * which would be very slow for large repos.
 */
export async function fetchRepoTree(
  owner: string,
  repo: string
): Promise<GitTreeItem[]> {
  // 1. Get the default branch name
  const repoRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    { headers: githubHeaders() }
  );

  if (!repoRes.ok) {
    const body = await repoRes.text();
    const hint =
      repoRes.status === 403
        ? " Set GITHUB_TOKEN in .env.local to raise the rate limit."
        : "";
    throw new Error(
      `GitHub API error (${repoRes.status}) fetching repo info: ${body}${hint}`
    );
  }

  const repoData = (await repoRes.json()) as { default_branch: string };
  const branch = repoData.default_branch;

  // 2. Fetch the full recursive tree in one call
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: githubHeaders() }
  );

  if (!treeRes.ok) {
    const body = await treeRes.text();
    throw new Error(
      `GitHub API error (${treeRes.status}) fetching tree: ${body}`
    );
  }

  const treeData = (await treeRes.json()) as GitTreeResponse;
  return treeData.tree;
}

// ---------------------------------------------------------------------------
// Graph building
// ---------------------------------------------------------------------------

/** Maximum number of TypeScript files we'll include to keep responses sane. */
const MAX_TS_FILES = 200;

/**
 * Given the raw tree from GitHub, build the AnalyzeResult:
 *  - Collect .ts / .tsx file paths (capped at MAX_TS_FILES)
 *  - Prefer files under `src/` if that directory exists, otherwise use repo root
 *  - Create graph nodes for top-level folders and files within the scope
 *  - Create edges from each folder to the files it contains
 */
export function buildAnalyzeResult(tree: GitTreeItem[]): AnalyzeResult {
  // --- Determine whether a `src/` directory exists ---
  const hasSrc = tree.some(
    (item) => item.type === "tree" && item.path === "src"
  );

  // The prefix we scope to: "src/" if it exists, otherwise "" (repo root)
  const scopePrefix = hasSrc ? "src/" : "";

  // --- Collect TypeScript files within scope ---
  const tsFiles = tree
    .filter(
      (item) =>
        item.type === "blob" &&
        item.path.startsWith(scopePrefix) &&
        (item.path.endsWith(".ts") || item.path.endsWith(".tsx"))
    )
    .slice(0, MAX_TS_FILES)
    .map((item) => item.path);

  // --- Build graph nodes and edges ---
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const filePath of tsFiles) {
    // Strip the scope prefix for display labels
    const relative = scopePrefix ? filePath.slice(scopePrefix.length) : filePath;

    // Determine the immediate parent folder (one level deep within scope)
    const segments = relative.split("/");

    if (segments.length > 1) {
      // File lives inside a subfolder — ensure a folder node exists
      const folderName = segments[0];
      const folderId = scopePrefix + folderName;

      if (!nodeMap.has(folderId)) {
        nodeMap.set(folderId, {
          id: folderId,
          label: folderName,
          type: "folder",
        });
      }

      // Add file node
      if (!nodeMap.has(filePath)) {
        nodeMap.set(filePath, {
          id: filePath,
          label: segments[segments.length - 1],
          type: "file",
        });
      }

      // Edge from folder → file
      edges.push({ from: folderId, to: filePath });
    } else {
      // File at the scope root level (no subfolder)
      if (!nodeMap.has(filePath)) {
        nodeMap.set(filePath, {
          id: filePath,
          label: segments[0],
          type: "file",
        });
      }
    }
  }

  return {
    overview: "Temporary placeholder overview. Real AI overview will come later.",
    files: tsFiles,
    graph: {
      nodes: Array.from(nodeMap.values()),
      edges,
    },
  };
}

// ---------------------------------------------------------------------------
// File Content & Context Selection Helpers for Q&A
// ---------------------------------------------------------------------------

/**
 * Fetch text content of a file from GitHub using raw.githubusercontent.com.
 * Returns up to maxChars (default 2000) to keep LLM context light.
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  maxChars = 2000
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`,
      { headers: githubHeaders() }
    );

    if (!res.ok) return null;

    const text = await res.text();
    if (text.length > maxChars) {
      return text.slice(0, maxChars) + "\n...[truncated]";
    }
    return text;
  } catch {
    return null;
  }
}

/**
 * Select top relevant file paths for a user's question.
 * Ranks by matching keywords in the path, falling back to key entrypoints or first files.
 */
export function selectRelevantFiles(
  files: string[],
  question: string,
  limit = 4
): string[] {
  const keywords = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = files.map((file) => {
    const lower = file.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
      if (lower.includes(kw)) score += 10;
    }

    // Boost common entry point and config files
    if (
      lower.endsWith("index.ts") ||
      lower.endsWith("index.tsx") ||
      lower.endsWith("app/page.tsx") ||
      lower.endsWith("main.ts") ||
      lower.endsWith("route.ts")
    ) {
      score += 3;
    }

    return { file, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.file);
}

