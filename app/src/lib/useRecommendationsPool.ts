"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useReadingNook } from "@/lib/app-state";
import { buildTasteSignals, sortRecommendationsPersonal } from "@/lib/recPersonalization";
import { getUserTopGenreLabels, sortRecGenresForFilter } from "@/lib/userTopGenres";
import { normalizeGenreList } from "@/lib/genreNormalize";

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
};

type LoadState = "loading" | "ready" | "error";

function isRecommendation(value: unknown): value is Recommendation {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (
    typeof row.bookId !== "string" ||
    typeof row.title !== "string" ||
    typeof row.author !== "string" ||
    typeof row.coverUrl !== "string" ||
    !Array.isArray(row.genres) ||
    !row.genres.every((g) => typeof g === "string") ||
    typeof row.score !== "number" ||
    !Number.isFinite(row.score) ||
    typeof row.reason !== "string" ||
    typeof row.source !== "string"
  ) {
    return false;
  }
  if ("rawScore" in row && row.rawScore !== undefined) {
    if (typeof row.rawScore !== "number" || !Number.isFinite(row.rawScore)) return false;
  }
  if ("rawKind" in row && row.rawKind !== undefined && typeof row.rawKind !== "string") {
    return false;
  }
  return true;
}

async function fetchRecommendations(): Promise<Recommendation[]> {
  const res = await fetch("/data/recommendations.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("Recommendations file is not an array.");
  const rows = data.filter(isRecommendation);
  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.bookId.localeCompare(b.bookId);
  });
  const deduped: Recommendation[] = [];
  const seenIds = new Set<string>();
  for (const r of rows) {
    if (seenIds.has(r.bookId)) continue;
    seenIds.add(r.bookId);
    deduped.push({ ...r, genres: normalizeGenreList(r.genres) });
  }
  return deduped;
}

export type RecommendationsPoolModel = {
  status: LoadState;
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
  /** True when re-ranking uses finished-book sentiment (see recPersonalization). */
  personalizationActive: boolean;
};

export function useRecommendationsPool(): RecommendationsPoolModel {
  const { state } = useReadingNook();
  const [status, setStatus] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [fetchKey, setFetchKey] = useState(0);

  const [genreSearch, setGenreSearch] = useState("");
  const [selectedGenreLowerKeys, setSelectedGenreLowerKeys] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchRecommendations();
        if (!cancelled) {
          setRows(data);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setStatus("error");
          setLoadError(
            "Could not load recommendations yet. Try rebuilding with `npm run build:recs` and then refresh.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const notShelvedRecs = useMemo(
    () => rows.filter((rec) => !state.userBooks[rec.bookId]),
    [rows, state.userBooks],
  );

  const personalizationActive = useMemo(() => buildTasteSignals(state).active, [state]);

  const personalizedNotShelved = useMemo(
    () => sortRecommendationsPersonal(notShelvedRecs, state),
    [notShelvedRecs, state],
  );

  const userTopGenreLower = useMemo(
    () => new Set(getUserTopGenreLabels(state, 5).map((l) => l.trim().toLowerCase())),
    [state],
  );

  const unionLowerToDisplay = useMemo(() => {
    const m = new Map<string, string>();
    for (const rec of personalizedNotShelved) {
      for (const g of rec.genres) {
        const t = g.trim();
        if (!t) continue;
        const k = t.toLowerCase();
        if (!m.has(k)) m.set(k, t);
      }
    }
    return m;
  }, [personalizedNotShelved]);

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
    if (activeFilterLowerKeys.length === 0) return personalizedNotShelved;
    const sel = new Set(activeFilterLowerKeys);
    return personalizedNotShelved.filter((rec) =>
      rec.genres.some((g) => sel.has(g.trim().toLowerCase())),
    );
  }, [personalizedNotShelved, activeFilterLowerKeys]);

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
    filterActive && queueAfterFilter === 0 && personalizedNotShelved.length > 0;
  const poolExhausted = rows.length > 0 && notShelvedRecs.length === 0;

  const retryLoad = useCallback(() => {
    setLoadError(null);
    setStatus("loading");
    setFetchKey((k) => k + 1);
  }, []);

  return {
    status,
    loadError,
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
  };
}
