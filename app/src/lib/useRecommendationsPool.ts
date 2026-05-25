"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
export const RECS_POOL_MAX = 60;

/** How many recommendation cards the UI shows at once. */
export const RECS_VISIBLE_COUNT = 10;

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

async function fetchDiscoverBooks(genres: string[]): Promise<SearchBookResult[]> {
  if (genres.length === 0) return [];
  const params = new URLSearchParams({ genres: genres.join(",") });
  const res = await fetch(`/api/books/discover?${params.toString()}`, { cache: "no-store" });
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
): RecommendationsPoolModel {
  const { state } = useReadingNook();
  const [discoverCache, setDiscoverCache] = useState<{
    genreKey: string;
    books: SearchBookResult[];
  }>({ genreKey: "", books: [] });

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

  useEffect(() => {
    if (!shouldFetchDiscover || !discoverGenreKey) return;
    if (discoverCache.genreKey === discoverGenreKey) return;

    let cancelled = false;
    void fetchDiscoverBooks(topGenresForDiscover).then((books) => {
      if (!cancelled) {
        setDiscoverCache({ genreKey: discoverGenreKey, books });
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

  const { rows, appNativeEmptyReason } = useMemo(() => {
    const native = buildAppNativeRecommendations(state, {
      discoverCandidates,
      maxResults: RECS_POOL_MAX,
      engine,
    });
    const normalized = native.recommendations.map((r) => ({
      ...r,
      genres: normalizeGenreList(r.genres),
    }));
    return {
      rows: normalized as Recommendation[],
      appNativeEmptyReason: native.emptyReason,
    };
  }, [state, discoverCandidates, engine]);

  const notShelvedRecs = useMemo(
    () =>
      rows.filter(
        (rec) =>
          !state.userBooks[rec.bookId] && !state.dismissedRecIds.includes(rec.bookId),
      ),
    [rows, state.userBooks, state.dismissedRecIds],
  );

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

  const filteredPool = useMemo(() => {
    if (activeFilterLowerKeys.length === 0) return notShelvedRecs;
    const sel = new Set(activeFilterLowerKeys);
    return notShelvedRecs.filter((rec) =>
      rec.genres.some((g) => sel.has(g.trim().toLowerCase())),
    );
  }, [notShelvedRecs, activeFilterLowerKeys]);

  const poolKey = useMemo(
    () =>
      [
        filteredPool.map((r) => r.bookId).join("|"),
        filterActive ? activeFilterLowerKeys.join("|") : "",
      ].join("::"),
    [filteredPool, filterActive, activeFilterLowerKeys],
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

  const queueAfterFilter = filteredPool.length;
  const hasFilterNoMatches =
    filterActive && queueAfterFilter === 0 && notShelvedRecs.length > 0;
  const poolExhausted = rows.length > 0 && notShelvedRecs.length === 0;

  const retryLoad = useCallback(() => {
    setDiscoverCache({ genreKey: "", books: [] });
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
