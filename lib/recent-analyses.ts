/**
 * lib/recent-analyses.ts
 *
 * Client-side helper module for managing recently analyzed repositories
 * in browser localStorage.
 */

export interface RecentAnalysis {
  repoUrl: string;
  analyzedAt: number;
}

const STORAGE_KEY = "codebase_atlas_recent";
const MAX_RECENT = 5;

/**
 * Extract "owner/repo" from a GitHub URL for clean UI display.
 */
export function formatRepoName(url: string): string {
  try {
    const { pathname } = new URL(url);
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  } catch {
    // ignore
  }
  return url;
}

/**
 * Read the list of recent analyses from localStorage.
 * SSR-safe: returns empty array if window is undefined.
 */
export function getRecentAnalyses(): RecentAnalysis[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentAnalysis[];
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item.repoUrl === "string");
    }
  } catch (err) {
    console.error("Failed to parse recent analyses from localStorage:", err);
  }
  return [];
}

/**
 * Add or bump a repo URL in the recent analyses list.
 * Writes back to localStorage and returns the updated list.
 */
export function addRecentAnalysis(repoUrl: string): RecentAnalysis[] {
  if (typeof window === "undefined" || !repoUrl || !repoUrl.trim()) {
    return [];
  }

  const cleanUrl = repoUrl.trim();
  const current = getRecentAnalyses();

  // Filter out any existing entry for the same repo (case-insensitive)
  const filtered = current.filter(
    (item) => item.repoUrl.toLowerCase() !== cleanUrl.toLowerCase()
  );

  // Prepend new entry
  const updated: RecentAnalysis[] = [
    { repoUrl: cleanUrl, analyzedAt: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save recent analysis to localStorage:", err);
  }

  return updated;
}
