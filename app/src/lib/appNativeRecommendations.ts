import { buildTasteSignals, type RecPersonalRow } from "@/lib/recPersonalization";
import { RECOMMENDATION_SCORE_FLOOR } from "@/lib/ranking";
import { HYBRID_SOURCE, hybridAprioriKnnRecommend, tfidfRecommend } from "@/lib/recommender";
import type { AppState, Book } from "@/lib/types";
import type { SearchBookResult } from "@/lib/bookProviders/types";

export { HYBRID_SOURCE };

export const APP_NATIVE_SOURCE_CATALOG = "app-native-catalog";
export const APP_NATIVE_SOURCE_DISCOVER = "openlibrary-discover";
export const RECOMMENDATION_ENGINES = ["hybrid", "tfidf"] as const;
export type RecommendationEngine = (typeof RECOMMENDATION_ENGINES)[number];

/** Fetch OL discover when unshelved catalog count is below this. */
export const CATALOG_UNSHELVED_DISCOVER_THRESHOLD = 15;

const DEFAULT_MAX_RESULTS = 60;
const BASE_CATALOG_SCORE = 5;

export type AppNativeRecommendationsInput = {
  /** OL genre discovery rows (display-only until shelved). */
  discoverCandidates?: readonly RecPersonalRow[];
  maxResults?: number;
  engine?: RecommendationEngine;
  /** Book IDs to exclude from the candidate pool (dismissed recs). */
  excludeBookIds?: readonly string[];
  /** Title words to exclude from the candidate pool (blacklist). */
  excludeTitleWords?: readonly string[];
};

export type AppNativeRecommendationsResult = {
  recommendations: RecPersonalRow[];
  emptyReason: string | null;
};

function buildRecommendationsByEngine(
  state: AppState,
  candidates: readonly RecPersonalRow[],
  maxResults: number,
  engine: RecommendationEngine,
): RecPersonalRow[] {
  if (engine === "tfidf") {
    return tfidfRecommend(state, candidates, { maxResults });
  }
  return hybridAprioriKnnRecommend(state, candidates, { maxResults });
}

export function isOpenLibraryBookId(bookId: string): boolean {
  return bookId.startsWith("openlibrary:");
}

function bookToCandidate(book: Book): RecPersonalRow {
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    genres: book.genres ?? [],
    score: BASE_CATALOG_SCORE,
    reason: "In your catalog but not on a shelf yet.",
    source: APP_NATIVE_SOURCE_CATALOG,
    ...(book.readinglogCount != null ? { readinglogCount: book.readinglogCount } : {}),
    ...(book.ratingsCount != null ? { ratingsCount: book.ratingsCount } : {}),
    ...(book.publishedYear != null ? { publishedYear: book.publishedYear } : {}),
  };
}

function discoverToCandidate(book: SearchBookResult): RecPersonalRow {
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    genres: book.genres ?? [],
    score: BASE_CATALOG_SCORE,
    reason: "Popular on Open Library in a genre you enjoy.",
    source: APP_NATIVE_SOURCE_DISCOVER,
    ...(book.readinglogCount != null ? { readinglogCount: book.readinglogCount } : {}),
    ...(book.ratingsCount != null ? { ratingsCount: book.ratingsCount } : {}),
    ...(book.publishedYear != null ? { publishedYear: book.publishedYear } : {}),
  };
}

/** Unshelved books in catalog (candidates for recs). */
export function countUnshelvedCatalog(state: AppState): number {
  const shelved = new Set(Object.keys(state.userBooks));
  let n = 0;
  for (const book of Object.values(state.catalog)) {
    if (book && !shelved.has(book.id)) n += 1;
  }
  return n;
}

export function collectCandidates(
  state: AppState,
  discoverCandidates: readonly RecPersonalRow[] = [],
  excludeBookIds: readonly string[] = [],
  excludeTitleWords: readonly string[] = [],
): RecPersonalRow[] {
  const shelved = new Set(Object.keys(state.userBooks));
  const excluded = new Set(excludeBookIds);
  const seen = new Set<string>();
  const out: RecPersonalRow[] = [];

  function titleBlacklisted(title: string): boolean {
    if (excludeTitleWords.length === 0) return false;
    return excludeTitleWords.some((w) => title.includes(w));
  }

  for (const book of Object.values(state.catalog)) {
    if (!book || shelved.has(book.id) || seen.has(book.id)) continue;
    if (excluded.has(book.id) || titleBlacklisted(book.title)) continue;
    seen.add(book.id);
    out.push(bookToCandidate(book));
  }

  for (const rec of discoverCandidates) {
    if (!isOpenLibraryBookId(rec.bookId)) continue;
    if (shelved.has(rec.bookId) || seen.has(rec.bookId)) continue;
    if (excluded.has(rec.bookId) || titleBlacklisted(rec.title)) continue;
    seen.add(rec.bookId);
    out.push(rec);
  }

  return out;
}

export function discoverResultsToCandidates(books: readonly SearchBookResult[]): RecPersonalRow[] {
  return books.map(discoverToCandidate);
}

/**
 * Build weighted Apriori + sentiment KNN recommendations from app state (catalog + OL discover only).
 */
export function buildAppNativeRecommendations(
  state: AppState,
  input: AppNativeRecommendationsInput = {},
): AppNativeRecommendationsResult {
  const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;
  const engine = input.engine ?? "hybrid";
  const signals = buildTasteSignals(state);

  if (!signals.active) {
    return {
      recommendations: [],
      emptyReason:
        "Finish and rate at least one book to get recommendations based on your taste.",
    };
  }

  const candidates = collectCandidates(
    state,
    input.discoverCandidates ?? [],
    input.excludeBookIds ?? [],
    input.excludeTitleWords ?? [],
  );

  if (candidates.length === 0) {
    return {
      recommendations: [],
      emptyReason:
        "No books to recommend yet. Search Open Library on Add to add titles, or finish rating more books so we can suggest popular reads in your genres.",
    };
  }

  let recommendations = buildRecommendationsByEngine(state, candidates, maxResults, engine);

  recommendations.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const popA = a.readinglogCount ?? 0;
    const popB = b.readinglogCount ?? 0;
    if (popB !== popA) return popB - popA;
    const aOl = isOpenLibraryBookId(a.bookId);
    const bOl = isOpenLibraryBookId(b.bookId);
    if (aOl !== bOl) return aOl ? -1 : 1;
    return a.bookId.localeCompare(b.bookId);
  });

  const aboveFloor = recommendations.filter((r) => r.score > RECOMMENDATION_SCORE_FLOOR);

  const MIN_FALLBACK_RECS = 10;
  if (aboveFloor.length >= MIN_FALLBACK_RECS) {
    recommendations = aboveFloor;
  } else {
    recommendations = recommendations.slice(0, Math.max(MIN_FALLBACK_RECS, aboveFloor.length));
  }

  recommendations = recommendations.slice(0, maxResults);

  if (recommendations.length === 0) {
    return {
      recommendations: [],
      emptyReason:
        "No strong matches right now — try shuffle, different genres, or search Open Library for a specific title.",
    };
  }

  return { recommendations, emptyReason: null };
}
