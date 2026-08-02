/**
 * lib/monorepo.ts
 *
 * Monorepo workspace detection logic. Inspects git tree items for package.json
 * locations, pnpm-workspace.yaml, turbo.json, and standard monorepo folder layouts
 * (apps/*, packages/*, modules/*, services/*, libs/*).
 */

export interface Workspace {
  name: string; // e.g. "packages/core", "apps/web"
  path: string; // relative path e.g. "packages/core"
  files: string[];
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  workspaces?: Workspace[];
}

export interface GitTreeItemLike {
  path: string;
  type: "blob" | "tree";
}

/**
 * Common top-level directories for monorepo packages/apps.
 */
const MONOREPO_PREFIXES = ["apps/", "packages/", "modules/", "services/", "libs/", "projects/", "tools/"];

/**
 * Detects if a repository uses a monorepo structure and identifies workspaces.
 */
export function detectMonorepo(
  tree: GitTreeItemLike[],
  sourceFiles: string[]
): MonorepoInfo {
  // 1. Find all subfolder package.json files (e.g., "packages/core/package.json" or "apps/web/package.json")
  const subpackagePaths = tree
    .filter(
      (item) =>
        item.type === "blob" &&
        item.path.endsWith("/package.json") &&
        item.path !== "package.json"
    )
    .map((item) => item.path);

  // 2. Check for monorepo configuration manifests (pnpm-workspace.yaml, turbo.json, lerna.json, nx.json)
  const hasMonorepoConfig = tree.some(
    (item) =>
      item.path === "pnpm-workspace.yaml" ||
      item.path === "turbo.json" ||
      item.path === "lerna.json" ||
      item.path === "nx.json"
  );

  // Collect unique workspace root paths (e.g. "packages/core", "apps/web")
  const workspacePaths = new Set<string>();

  for (const pkgPath of subpackagePaths) {
    const dir = pkgPath.replace(/\/package\.json$/i, "");
    if (dir) {
      workspacePaths.add(dir);
    }
  }

  // Fallback: If monorepo config exists but subpackages lack package.json files, group by monorepo prefix
  if (workspacePaths.size === 0 && hasMonorepoConfig) {
    for (const file of sourceFiles) {
      for (const prefix of MONOREPO_PREFIXES) {
        if (file.startsWith(prefix)) {
          const parts = file.split("/");
          if (parts.length >= 2) {
            workspacePaths.add(`${parts[0]}/${parts[1]}`);
          }
        }
      }
    }
  }

  const isMonorepo = workspacePaths.size > 0 || (hasMonorepoConfig && subpackagePaths.length > 0);

  if (!isMonorepo || workspacePaths.size === 0) {
    return { isMonorepo: false };
  }

  // 3. Build workspace structures and partition source files
  const sortedWorkspacePaths = Array.from(workspacePaths).sort();
  const workspaces: Workspace[] = sortedWorkspacePaths.map((wPath) => {
    const prefix = wPath.endsWith("/") ? wPath : `${wPath}/`;
    const matchingFiles = sourceFiles.filter((f) => f.startsWith(prefix));

    return {
      name: wPath,
      path: wPath,
      files: matchingFiles,
    };
  });

  return {
    isMonorepo: true,
    workspaces,
  };
}
