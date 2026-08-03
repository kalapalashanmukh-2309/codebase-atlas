/**
 * lib/saved-views.ts
 *
 * Data model and localStorage helpers for saving/restoring named "views"
 * (graph mode + focused files) per repository in Codebase Atlas.
 *
 * All localStorage access is guarded for SSR safety.
 */

// ---------------------------------------------------------------------------
// Data Model
// ---------------------------------------------------------------------------

export type SavedView = {
  id: string;
  repoUrl: string;
  title: string;
  description?: string;
  graphMode: "high-level" | "detailed";
  focusFiles?: string[];
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "codebase_atlas_saved_views";

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function generateId(): string {
  return `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAll(): SavedView[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedView[];
  } catch {
    return [];
  }
}

function writeAll(views: SavedView[]): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    console.warn("[saved-views] Failed to write to localStorage");
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all saved views across all repositories.
 */
export function getSavedViews(): SavedView[] {
  return readAll();
}

/**
 * Returns saved views filtered to a specific repository URL.
 */
export function getSavedViewsForRepo(repoUrl: string): SavedView[] {
  return readAll().filter((v) => v.repoUrl === repoUrl);
}

/**
 * Persists a new saved view and returns the complete object (with generated
 * `id` and `createdAt` fields).
 */
export function saveView(
  view: Omit<SavedView, "id" | "createdAt">
): SavedView {
  const newView: SavedView = {
    ...view,
    id: generateId(),
    createdAt: Date.now(),
  };

  const all = readAll();
  all.push(newView);
  writeAll(all);

  return newView;
}

/**
 * Deletes a saved view by its unique `id`.
 */
export function deleteView(id: string): void {
  const all = readAll();
  const filtered = all.filter((v) => v.id !== id);
  writeAll(filtered);
}
