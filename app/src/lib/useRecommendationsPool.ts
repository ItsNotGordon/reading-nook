"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReadingNook } from "@/lib/app-state";
import {
  buildAppNativeRecommendations,
  CATALOG_UNSHELVED_DISCOVER_THRESHOLD,
  countUnshelvedCatalog,
  discoverResultsToCandidates,
  type RecommendationEngine,
} from "@/lib/appNativeRecommendations";
import { buildTasteSignals } from "@/lib/recPersonalization";
import { getWeightedTopGenres } from "@/lib/recommender";
import { getUserTopGenreLabels, sortRecGenresForFilter } from "@/lib/userTopGenres";
import { normalizeGenreList } from "@/lib/genreNormalize";
import type { SearchBookResult } from "@/lib/bookProviders/types";

/** Max ranked recommendations kept in the client pool. */
export const RECS_POOL_MAX = 120;

/** How many recommendation cards the UI shows at once. */
export const RECS_VISIBLE_COUNT = 10;

/** When the usable pool drops below this, fetch the next page of discover results. */
const REFILL_THRESHOLD = 10;

/** Don't fetch more than this many pages (0-indexed). */
const MAX_DISCOVER_PAGES = 1;

/** Cooldown after a 429 rate-limit response (5 minutes). */
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;

export type Recommendation = {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  genres: string[];
  score: number;
  rawScore?: number;
  rawKind?: string;
  reason: string;
  source: string;
  readinglogCount?: number;
  ratingsCount?: number;
  publishedYear?: number;
};

export type RecommendationsPoolModel = {
  status: "ready";
  loadError: string | null;
  retryLoad: () => void;
  rows: Recommendation[];
  notShelvedRecs: Recommendation[];
  filteredPool: Recommendation[];
  visibleRecs: Recommendation[];
  reshuffle: () => void;
  sortedFilterGenres: string[];
  genresForChipRow: string[];
  activeFilterLowerKeys: string[];
  userTopGenreLower: Set<string>;
  toggleGenreFilter: (lower: string) => void;
  clearGenreFilters: () => void;
  filterActive: boolean;
  queueAfterFilter: number;
  hasFilterNoMatches: boolean;
  poolExhausted: boolean;
  personalizationActive: boolean;
  appNativeEmptyReason: string | null;
  discoverLoading: boolean;
  engine: RecommendationEngine;
  setEngine: (engine: RecommendationEngine) => void;
};

function isSearchBook(value: unknown): value is SearchBookResult {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.title === "string" &&
    typeof row.author === "string" &&
    typeof row.coverUrl === "string" &&
    Array.isArray(row.genres)
  );
}

function sampleRandomBookIds(pool: Recommendation[], count: number): string[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((r) => r.bookId);
}

let discoverCooldownUntil = 0;

async function fetchDiscoverBooks(
  genres: string[],
  page = 0,
): Promise<SearchBookResult[]> {
  if (genres.length === 0) return [];
  if (Date.now() < discoverCooldownUntil) return [];

  const params = new URLSearchParams({ genres: genres.join(","), page: String(page) });
  const res = await fetch(`/api/books/discover?${params.toString()}`, { cache: "no-store" });

  if (res.status === 429) {
    discoverCooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    console.warn(`[discover] rate-limited, cooling down for 5 minutes`);
    return [];
  }
  if (!res.ok) return [];

  const data: unknown = await res.json();
  if (!data || typeof data !== "object") return [];
  const books = (data as { books?: unknown }).books;
  if (!Array.isArray(books)) return [];
  return books.filter(isSearchBook);
}

export function useRecommendationsPool(
  chipFilterQuery = "",
  engine: RecommendationEngine = "hybrid",
  setEngine: (engine: RecommendationEngine) => void = () => undefined,
  minYear: number | null = null,
  maxYear: number | null = null,
  blacklistEnabled = true,
): RecommendationsPoolModel {
  const { state } = useReadingNook();
  const [discoverCache, setDiscoverCache] = useState<{
    genreKey: string;
    books: SearchBookResult[];
    nextPage: number;
  }>({ genreKey: "", books: [], nextPage: 0 });

  const fetchingRef = useRef(false);

  const [selectedGenreLowerKeys, setSelectedGenreLowerKeys] = useState<string[]>([]);
  const [shuffleSample, setShuffleSample] = useState<{
    poolKey: string;
    ids: string[];
  } | null>(null);

  const tasteActive = useMemo(() => buildTasteSignals(state).active, [state]);
  const unshelvedCatalogCount = useMemo(() => countUnshelvedCatalog(state), [state]);
  const topGenresForDiscover = useMemo(
    () => getWeightedTopGenres(state, 2),
    [state],
  );

  const discoverGenreKey = topGenresForDiscover.join("|");

  const shouldFetchDiscover =
    tasteActive && unshelvedCatalogCount < CATALOG_UNSHELVED_DISCOVER_THRESHOLD;

  const discoverLoading =
    shouldFetchDiscover &&
    Boolean(discoverGenreKey) &&
    discoverCache.genreKey !== discoverGenreKey;

  // Initial fetch when genres change (page 0)
  useEffect(() => {
    if (!shouldFetchDiscover || !discoverGenreKey) return;
    if (discoverCache.genreKey === discoverGenreKey) return;

    fetchingRef.current = true;
    let cancelled = false;
    void fetchDiscoverBooks(topGenresForDiscover, 0).then((books) => {
      fetchingRef.current = false;
      if (!cancelled) {
        setDiscoverCache({
          genreKey: discoverGenreKey,
          books,
          nextPage: 1,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shouldFetchDiscover, discoverGenreKey, topGenresForDiscover, discoverCache.genreKey]);

  const discoverCandidates = useMemo(() => {
    if (!shouldFetchDiscover || !discoverGenreKey) return [];
    if (discoverCache.genreKey !== discoverGenreKey) return [];
    return discoverResultsToCandidates(discoverCache.books);
  }, [shouldFetchDiscover, discoverGenreKey, discoverCache]);

  const excludeTitleWords = useMemo(
    () => (blacklistEnabled ? state.blacklistedTitleWords : []),
    [blacklistEnabled, state.blacklistedTitleWords],
  );

  const { rows, appNativeEmptyReason } = useMemo(() => {
    const native = buildAppNativeRecommendations(state, {
      discoverCandidates,
      maxResults: RECS_POOL_MAX,
      engine,
      excludeBookIds: state.dismissedRecIds,
      excludeTitleWords,
    });
    const normalized = native.recommendations.map((r) => ({
      ...r,
      genres: normalizeGenreList(r.genres),
    }));
    return {
      rows: normalized as Recommendation[],
      appNativeEmptyReason: native.emptyReason,
    };
  }, [state, discoverCandidates, engine, excludeTitleWords]);

  const notShelvedRecs = useMemo(
    () =>
      rows.filter(
        (rec) =>
          !state.userBooks[rec.bookId] && !state.dismissedRecIds.includes(rec.bookId),
      ),
    [rows, state.userBooks, state.dismissedRecIds],
  );

  // Auto-refill: fetch next page when pool shrinks below threshold
  useEffect(() => {
    if (!shouldFetchDiscover) return;
    if (discoverCache.genreKey !== discoverGenreKey) return;
    if (fetchingRef.current) return;
    if (discoverCache.nextPage >= MAX_DISCOVER_PAGES) return;
    if (notShelvedRecs.length >= REFILL_THRESHOLD) return;

    const page = discoverCache.nextPage;
    fetchingRef.current = true;

    let cancelled = false;
    void fetchDiscoverBooks(topGenresForDiscover, page).then((newBooks) => {
      fetchingRef.current = false;
      if (cancelled) return;
      setDiscoverCache((prev) => {
        if (prev.genreKey !== discoverGenreKey) return prev;
        const existingIds = new Set(prev.books.map((b) => b.id));
        const deduped = newBooks.filter((b) => !existingIds.has(b.id));
        return {
          ...prev,
          books: [...prev.books, ...deduped],
          nextPage: page + 1,
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    shouldFetchDiscover,
    discoverGenreKey,
    discoverCache.genreKey,
    discoverCache.nextPage,
    notShelvedRecs.length,
    topGenresForDiscover,
  ]);

  const personalizationActive = tasteActive;

  const userTopGenreLower = useMemo(
    () => new Set(getUserTopGenreLabels(state, 5).map((l) => l.trim().toLowerCase())),
    [state],
  );

  const unionLowerToDisplay = useMemo(() => {
    const m = new Map<string, string>();
    for (const rec of notShelvedRecs) {
      for (const g of rec.genres) {
        const t = g.trim();
        if (!t) continue;
        const k = t.toLowerCase();
        if (!m.has(k)) m.set(k, t);
      }
    }
    return m;
  }, [notShelvedRecs]);

  const sortedFilterGenres = useMemo(
    () => sortRecGenresForFilter(state, unionLowerToDisplay),
    [state, unionLowerToDisplay],
  );

  const chipFilterNorm = chipFilterQuery.trim().toLowerCase();
  const genresForChipRow = useMemo(() => {
    if (!chipFilterNorm) return sortedFilterGenres;
    return sortedFilterGenres.filter((label) => label.toLowerCase().includes(chipFilterNorm));
  }, [sortedFilterGenres, chipFilterNorm]);

  const activeFilterLowerKeys = useMemo(
    () => selectedGenreLowerKeys.filter((k) => unionLowerToDisplay.has(k)),
    [selectedGenreLowerKeys, unionLowerToDisplay],
  );

  const filterActive = activeFilterLowerKeys.length > 0;

  const blacklistWords = state.blacklistedTitleWords;
  const afterBlacklist = useMemo(() => {
    if (!blacklistEnabled || blacklistWords.length === 0) return notShelvedRecs;
    return notShelvedRecs.filter(
      (rec) => !blacklistWords.some((w) => rec.title.includes(w)),
    );
  }, [notShelvedRecs, blacklistEnabled, blacklistWords]);

  const genreFilteredPool = useMemo(() => {
    if (activeFilterLowerKeys.length === 0) return afterBlacklist;
    const sel = new Set(activeFilterLowerKeys);
    return afterBlacklist.filter((rec) =>
      rec.genres.some((g) => sel.has(g.trim().toLowerCase())),
    );
  }, [afterBlacklist, activeFilterLowerKeys]);

  const filteredPool = useMemo(() => {
    if (minYear == null && maxYear == null) return genreFilteredPool;
    return genreFilteredPool.filter((rec) => {
      if (rec.publishedYear == null) return false;
      if (minYear != null && rec.publishedYear < minYear) return false;
      if (maxYear != null && rec.publishedYear > maxYear) return false;
      return true;
    });
  }, [genreFilteredPool, minYear, maxYear]);

  const poolKey = useMemo(
    () =>
      [
        filteredPool.map((r) => r.bookId).join("|"),
        filterActive ? activeFilterLowerKeys.join("|") : "",
        minYear ?? "",
        maxYear ?? "",
      ].join("::"),
    [filteredPool, filterActive, activeFilterLowerKeys, minYear, maxYear],
  );

  const visibleRecs = useMemo(() => {
    if (filteredPool.length === 0) return [];
    const defaultVisible = filteredPool.slice(0, RECS_VISIBLE_COUNT);
    if (!shuffleSample || shuffleSample.poolKey !== poolKey) {
      return defaultVisible;
    }
    const byId = new Map(filteredPool.map((r) => [r.bookId, r]));
    return shuffleSample.ids
      .map((id) => byId.get(id))
      .filter((r): r is Recommendation => Boolean(r));
  }, [filteredPool, shuffleSample, poolKey]);

  const reshuffle = useCallback(() => {
    const ids = sampleRandomBookIds(filteredPool, RECS_VISIBLE_COUNT);
    setShuffleSample({ poolKey, ids });
  }, [filteredPool, poolKey]);

  const toggleGenreFilter = useCallback((lower: string) => {
    setSelectedGenreLowerKeys((prev) => {
      if (prev.includes(lower)) return prev.filter((k) => k !== lower);
      return [...prev, lower].sort((a, b) => a.localeCompare(b));
    });
  }, []);

  const clearGenreFilters = useCallback(() => setSelectedGenreLowerKeys([]), []);

  const yearFilterActive = minYear != null || maxYear != null;
  const queueAfterFilter = filteredPool.length;
  const hasFilterNoMatches =
    (filterActive || yearFilterActive) && queueAfterFilter === 0 && notShelvedRecs.length > 0;
  const poolExhausted = rows.length > 0 && notShelvedRecs.length === 0;

  const retryLoad = useCallback(() => {
    fetchingRef.current = false;
    setDiscoverCache({ genreKey: "", books: [], nextPage: 0 });
  }, []);

  return {
    status: "ready",
    loadError: null,
    retryLoad,
    rows,
    notShelvedRecs,
    filteredPool,
    visibleRecs,
    reshuffle,
    sortedFilterGenres,
    genresForChipRow,
    activeFilterLowerKeys,
    userTopGenreLower,
    toggleGenreFilter,
    clearGenreFilters,
    filterActive,
    queueAfterFilter,
    hasFilterNoMatches,
    poolExhausted,
    personalizationActive,
    appNativeEmptyReason,
    discoverLoading,
    engine,
    setEngine,
  };
}
