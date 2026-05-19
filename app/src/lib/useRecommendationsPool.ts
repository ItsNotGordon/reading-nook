"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useReadingNook } from "@/lib/app-state";
import {
  buildAppNativeRecommendations,
  CATALOG_UNSHELVED_DISCOVER_THRESHOLD,
  countUnshelvedCatalog,
  discoverResultsToCandidates,
} from "@/lib/appNativeRecommendations";
import { buildTasteSignals } from "@/lib/recPersonalization";
import { getWeightedTopGenres } from "@/lib/recommender";
import { getUserTopGenreLabels, sortRecGenresForFilter } from "@/lib/userTopGenres";
import { normalizeGenreList } from "@/lib/genreNormalize";
import type { SearchBookResult } from "@/lib/bookProviders/types";

/** How many recommendation rows the UI shows at once (pool can be much larger). */
export const RECS_VISIBLE_COUNT = 30;

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
};

export type RecommendationsPoolModel = {
  status: "ready";
  loadError: string | null;
  retryLoad: () => void;
  rows: Recommendation[];
  notShelvedRecs: Recommendation[];
  displayRecs: Recommendation[];
  sortedFilterGenres: string[];
  genresForChipRow: string[];
  genreSearch: string;
  setGenreSearch: Dispatch<SetStateAction<string>>;
  genreSearchNorm: string;
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

export function useRecommendationsPool(): RecommendationsPoolModel {
  const { state } = useReadingNook();
  const [discoverCache, setDiscoverCache] = useState<{
    genreKey: string;
    books: SearchBookResult[];
  }>({ genreKey: "", books: [] });

  const [genreSearch, setGenreSearch] = useState("");
  const [selectedGenreLowerKeys, setSelectedGenreLowerKeys] = useState<string[]>([]);

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
    const native = buildAppNativeRecommendations(state, { discoverCandidates });
    const normalized = native.recommendations.map((r) => ({
      ...r,
      genres: normalizeGenreList(r.genres),
    }));
    return {
      rows: normalized as Recommendation[],
      appNativeEmptyReason: native.emptyReason,
    };
  }, [state, discoverCandidates]);

  const notShelvedRecs = useMemo(
    () => rows.filter((rec) => !state.userBooks[rec.bookId]),
    [rows, state.userBooks],
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

  const genreSearchNorm = genreSearch.trim().toLowerCase();
  const genresForChipRow = useMemo(() => {
    if (!genreSearchNorm) return sortedFilterGenres;
    return sortedFilterGenres.filter((label) => label.toLowerCase().includes(genreSearchNorm));
  }, [sortedFilterGenres, genreSearchNorm]);

  const activeFilterLowerKeys = useMemo(
    () => selectedGenreLowerKeys.filter((k) => unionLowerToDisplay.has(k)),
    [selectedGenreLowerKeys, unionLowerToDisplay],
  );

  const afterGenreFilter = useMemo(() => {
    if (activeFilterLowerKeys.length === 0) return notShelvedRecs;
    const sel = new Set(activeFilterLowerKeys);
    return notShelvedRecs.filter((rec) =>
      rec.genres.some((g) => sel.has(g.trim().toLowerCase())),
    );
  }, [notShelvedRecs, activeFilterLowerKeys]);

  const displayRecs = useMemo(
    () => afterGenreFilter.slice(0, RECS_VISIBLE_COUNT),
    [afterGenreFilter],
  );

  const toggleGenreFilter = useCallback((lower: string) => {
    setSelectedGenreLowerKeys((prev) => {
      if (prev.includes(lower)) return prev.filter((k) => k !== lower);
      return [...prev, lower].sort((a, b) => a.localeCompare(b));
    });
  }, []);

  const clearGenreFilters = useCallback(() => setSelectedGenreLowerKeys([]), []);

  const filterActive = activeFilterLowerKeys.length > 0;
  const queueAfterFilter = afterGenreFilter.length;
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
    displayRecs,
    sortedFilterGenres,
    genresForChipRow,
    genreSearch,
    setGenreSearch,
    genreSearchNorm,
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
  };
}
