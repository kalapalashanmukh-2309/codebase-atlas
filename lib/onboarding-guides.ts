/**
 * lib/onboarding-guides.ts
 *
 * Data model and localStorage helpers for managing onboarding guides
 * (curated list of steps with view states + suggested questions) per repo.
 *
 * All localStorage access is guarded for SSR safety.
 */

// ---------------------------------------------------------------------------
// Data Model
// ---------------------------------------------------------------------------

export type OnboardingStep = {
  id: string;
  title: string; // e.g. "Auth flow"
  description?: string;
  graphMode: "high-level" | "detailed";
  focusFiles?: string[];
  suggestedQuestions: string[]; // 2–4 questions
};

export type OnboardingGuide = {
  id: string;
  repoUrl: string;
  name: string; // e.g. "First week in this repo"
  steps: OnboardingStep[];
  createdAt: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "codebase_atlas_onboarding_guides";

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function generateId(prefix = "guide"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAll(): OnboardingGuide[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as OnboardingGuide[];
  } catch {
    return [];
  }
}

function writeAll(guides: OnboardingGuide[]): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guides));
  } catch {
    console.warn("[onboarding-guides] Failed to write to localStorage");
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all onboarding guides across all repositories.
 */
export function getOnboardingGuides(): OnboardingGuide[] {
  return readAll();
}

/**
 * Returns the onboarding guide for a specific repository URL, or null if none exists.
 */
export function getOnboardingGuideForRepo(repoUrl: string): OnboardingGuide | null {
  const guides = readAll();
  return guides.find((g) => g.repoUrl === repoUrl) || null;
}

/**
 * Persists a new onboarding guide and returns the complete object with
 * auto-generated `id` and `createdAt` timestamp, as well as step IDs if missing.
 */
export function saveGuide(
  guide: Omit<OnboardingGuide, "id" | "createdAt">
): OnboardingGuide {
  const stepsWithIds: OnboardingStep[] = guide.steps.map((step) => ({
    ...step,
    id: step.id || generateId("step"),
  }));

  const newGuide: OnboardingGuide = {
    ...guide,
    steps: stepsWithIds,
    id: generateId("guide"),
    createdAt: Date.now(),
  };

  const all = readAll();
  all.push(newGuide);
  writeAll(all);

  return newGuide;
}

/**
 * Updates an existing onboarding guide in localStorage by matching `id`.
 */
export function updateGuide(guide: OnboardingGuide): void {
  const all = readAll();
  const index = all.findIndex((g) => g.id === guide.id);
  if (index !== -1) {
    all[index] = guide;
    writeAll(all);
  }
}

/**
 * Deletes an onboarding guide by its unique `id`.
 */
export function deleteGuide(id: string): void {
  const all = readAll();
  const filtered = all.filter((g) => g.id !== id);
  writeAll(filtered);
}

// ---------------------------------------------------------------------------
// Onboarding Progress API
// ---------------------------------------------------------------------------

function getProgressKey(guideId: string): string {
  return `codebase_atlas_onboarding_progress_${guideId}`;
}

/**
 * Returns array of completed step IDs for a given onboarding guide.
 */
export function getGuideProgress(guideId: string): string[] {
  if (!isBrowser() || !guideId) return [];
  try {
    const raw = localStorage.getItem(getProgressKey(guideId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Toggles a step's completion status for a guide and returns updated completed step IDs.
 */
export function toggleStepProgress(guideId: string, stepId: string): string[] {
  if (!isBrowser() || !guideId || !stepId) return [];
  const current = getGuideProgress(guideId);
  const exists = current.includes(stepId);
  const updated = exists ? current.filter((id) => id !== stepId) : [...current, stepId];

  try {
    localStorage.setItem(getProgressKey(guideId), JSON.stringify(updated));
  } catch {
    console.warn("[onboarding-guides] Failed to write progress to localStorage");
  }

  return updated;
}

