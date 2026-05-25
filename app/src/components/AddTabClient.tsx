"use client";

import { useCallback, useState } from "react";
import { AddBookScreen } from "@/components/AddBookScreen";
import { FilterToolbar } from "@/components/FilterToolbar";
import { RecsListPanel } from "@/components/RecsListPanel";
import type { RecommendationEngine } from "@/lib/appNativeRecommendations";
import { useRecommendationsPool } from "@/lib/useRecommendationsPool";
import { useReadingNook } from "@/lib/app-state";

type FilterPanel = "genre" | "year" | "system" | null;

export function AddTabClient() {
  const { state } = useReadingNook();
  const [searchQuery, setSearchQuery] = useState("");
  const [engine, setEngine] = useState<RecommendationEngine>("hybrid");
  const [minYear, setMinYear] = useState("");
  const [maxYear, setMaxYear] = useState("");
  const [blacklistEnabled, setBlacklistEnabled] = useState(true);
  const parsedMin = minYear !== "" ? parseInt(minYear, 10) : null;
  const parsedMax = maxYear !== "" ? parseInt(maxYear, 10) : null;
  const yearInvalid =
    parsedMin != null &&
    !Number.isNaN(parsedMin) &&
    parsedMax != null &&
    !Number.isNaN(parsedMax) &&
    parsedMin > parsedMax;
  const effectiveMin = yearInvalid || parsedMin == null || Number.isNaN(parsedMin) ? null : parsedMin;
  const effectiveMax = yearInvalid || parsedMax == null || Number.isNaN(parsedMax) ? null : parsedMax;

  const hasBlacklistWords = state.blacklistedTitleWords.length > 0;

  const recs = useRecommendationsPool(searchQuery, engine, setEngine, effectiveMin, effectiveMax, blacklistEnabled);

  const [openPanel, setOpenPanel] = useState<FilterPanel>(null);

  const genreProps =
    recs.status === "ready" && recs.sortedFilterGenres.length > 0
      ? {
          sortedFilterGenres: recs.sortedFilterGenres,
          genresForChipRow: recs.genresForChipRow,
          filterActive: recs.filterActive,
          activeFilterLowerKeys: recs.activeFilterLowerKeys,
          userTopGenreLower: recs.userTopGenreLower,
          toggleGenreFilter: recs.toggleGenreFilter,
          clearGenreFilters: recs.clearGenreFilters,
        }
      : null;

  const clearAllFilters = useCallback(() => {
    if (recs.status === "ready") recs.clearGenreFilters();
    setMinYear("");
    setMaxYear("");
    setEngine("hybrid");
    setOpenPanel(null);
  }, [recs]);

  const afterSearch = (
    <FilterToolbar
      openPanel={openPanel}
      onTogglePanel={setOpenPanel}
      genreProps={genreProps}
      minYear={minYear}
      maxYear={maxYear}
      onMinYearChange={setMinYear}
      onMaxYearChange={setMaxYear}
      engine={engine}
      onEngineChange={setEngine}
      onClearAll={clearAllFilters}
      blacklistEnabled={blacklistEnabled}
      onBlacklistToggle={() => setBlacklistEnabled((prev) => !prev)}
      hasBlacklistWords={hasBlacklistWords}
    />
  );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <AddBookScreen
        query={searchQuery}
        onQueryChange={setSearchQuery}
        afterSearch={afterSearch}
        minYear={effectiveMin}
        maxYear={effectiveMax}
      />
      <RecsListPanel model={recs} />
    </div>
  );
}
