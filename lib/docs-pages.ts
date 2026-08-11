/**
 * lib/docs-pages.ts
 *
 * Data model and storage helpers for generating and managing "Living Docs"
 * pages derived from saved views and onboarding steps per repository.
 *
 * All localStorage access is guarded for SSR safety.
 */

import { getSavedViewsForRepo, type SavedView } from "./saved-views";
import { getOnboardingGuideForRepo, type OnboardingGuide } from "./onboarding-guides";

// ---------------------------------------------------------------------------
// Data Model
// ---------------------------------------------------------------------------

import { type GraphMode } from "./graph-builder";

export type DocsPage = {
  id: string;
  repoUrl: string;
  slug: string; // e.g. "overview", "auth-flow"
  title: string;
  summary: string; // 1–3 sentences
  graphMode: GraphMode;
  focusFiles?: string[];
  suggestedQuestions: string[];
  order: number; // for sorting
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "codebase_atlas_docs_pages";

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readAll(): DocsPage[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as DocsPage[];
  } catch {
    return [];
  }
}

function writeAll(pages: DocsPage[]): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  } catch {
    console.warn("[docs-pages] Failed to write to localStorage");
  }
}

// ---------------------------------------------------------------------------
// Conversion Helper
// ---------------------------------------------------------------------------

/**
 * Derives initial DocsPage entries for a repo from its saved views and onboarding guide steps.
 */
export function deriveDocsPagesFromRepoState(
  repoUrl: string,
  savedViews: SavedView[],
  onboardingGuide: OnboardingGuide | null
): DocsPage[] {
  const pages: DocsPage[] = [];
  const usedSlugs = new Set<string>();
  let order = 0;

  // 0. Always include default "Overview" page out of the box
  const overviewSlug = "overview";
  usedSlugs.add(overviewSlug);
  pages.push({
    id: `doc_overview_${slugify(repoUrl)}`,
    repoUrl,
    slug: overviewSlug,
    title: "Overview",
    summary: `High-level architectural overview of ${repoUrl}, highlighting key modules and core entry points.`,
    graphMode: "high-level",
    focusFiles: undefined,
    suggestedQuestions: [
      "What is the main purpose of this repo?",
      "Where are the main entry points located?",
      "How are core modules structured?",
      "Where does execution or request handling start?",
    ],
    order: order++,
  });

  // 1. Convert Onboarding steps
  if (onboardingGuide && onboardingGuide.steps.length > 0) {
    for (const step of onboardingGuide.steps) {
      let baseSlug = slugify(step.title) || `step-${order + 1}`;
      let slug = baseSlug;
      let counter = 1;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${counter++}`;
      }
      usedSlugs.add(slug);

      pages.push({
        id: `doc_step_${step.id}`,
        repoUrl,
        slug,
        title: step.title,
        summary:
          step.description?.trim() ||
          `Onboarding walkthrough step for ${step.title} in ${repoUrl}.`,
        graphMode: step.graphMode,
        focusFiles: step.focusFiles,
        suggestedQuestions: step.suggestedQuestions || [
          `Where is ${step.title} defined?`,
          `How does ${step.title} interact with other modules?`,
        ],
        order: order++,
      });
    }
  }

  // 2. Convert Saved Views
  for (const view of savedViews) {
    let baseSlug = slugify(view.title) || `view-${order + 1}`;
    let slug = baseSlug;
    let counter = 1;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }
    usedSlugs.add(slug);

    pages.push({
      id: `doc_view_${view.id}`,
      repoUrl,
      slug,
      title: view.title,
      summary:
        view.description?.trim() ||
        `Architectural view for ${view.title} in ${repoUrl}.`,
      graphMode: view.graphMode,
      focusFiles: view.focusFiles,
      suggestedQuestions: [
        `What are the key components in ${view.title}?`,
        `Where are entry points for ${view.title}?`,
      ],
      order: order++,
    });
  }

  return pages;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all custom and stored docs pages across repositories.
 */
export function getDocsPages(): DocsPage[] {
  return readAll();
}

/**
 * Returns stored docs pages for a repository, or auto-generates them from saved views
 * and onboarding steps if none exist yet in localStorage.
 */
export function getDocsPagesForRepo(repoUrl: string): DocsPage[] {
  const allStored = readAll();
  const repoPages = allStored.filter((p) => p.repoUrl === repoUrl);

  if (repoPages.length > 0) {
    const hasOverview = repoPages.some((p) => p.slug === "overview");
    if (!hasOverview) {
      const overviewPage: DocsPage = {
        id: `doc_overview_${slugify(repoUrl)}`,
        repoUrl,
        slug: "overview",
        title: "Overview",
        summary: `High-level architectural overview of ${repoUrl}, highlighting key modules and core entry points.`,
        graphMode: "high-level",
        focusFiles: undefined,
        suggestedQuestions: [
          "What is the main purpose of this repo?",
          "Where are the main entry points located?",
          "How are core modules structured?",
          "Where does execution or request handling start?",
        ],
        order: 0,
      };
      const updated = [overviewPage, ...repoPages];
      writeAll([...allStored, overviewPage]);
      return updated.sort((a, b) => a.order - b.order);
    }
    return repoPages.sort((a, b) => a.order - b.order);
  }

  // Auto-generate from saved views + onboarding guide if no stored pages exist yet
  const views = getSavedViewsForRepo(repoUrl);
  const guide = getOnboardingGuideForRepo(repoUrl);

  const derived = deriveDocsPagesFromRepoState(repoUrl, views, guide);
  if (derived.length > 0) {
    // Persist auto-generated pages so user edits are retained
    const updatedAll = [...allStored, ...derived];
    writeAll(updatedAll);
  }

  return derived.sort((a, b) => a.order - b.order);
}

/**
 * Saves a new custom docs page and returns the complete object.
 */
export function saveDocsPage(page: Omit<DocsPage, "id">): DocsPage {
  const newPage: DocsPage = {
    ...page,
    id: generateId(),
    slug: slugify(page.slug || page.title),
  };

  const all = readAll();
  all.push(newPage);
  writeAll(all);

  return newPage;
}

/**
 * Updates an existing docs page by ID.
 */
export function updateDocsPage(page: DocsPage): void {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === page.id);
  if (idx !== -1) {
    all[idx] = {
      ...page,
      slug: slugify(page.slug || page.title),
    };
    writeAll(all);
  }
}

/**
 * Deletes a docs page by ID.
 */
export function deleteDocsPage(id: string): void {
  const all = readAll();
  const filtered = all.filter((p) => p.id !== id);
  writeAll(filtered);
}
