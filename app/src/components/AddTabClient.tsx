"use client";

import { useState } from "react";
import { AddBookScreen } from "@/components/AddBookScreen";
import { RecsGenreFilterBar } from "@/components/RecsGenreFilterBar";
import { RecsListPanel } from "@/components/RecsListPanel";
import { useRecommendationsPool } from "@/lib/useRecommendationsPool";

export function AddTabClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const recs = useRecommendationsPool(searchQuery);

  const genreBar =
    recs.status === "ready" && recs.sortedFilterGenres.length > 0 ? (
      <RecsGenreFilterBar
        sortedFilterGenres={recs.sortedFilterGenres}
        genresForChipRow={recs.genresForChipRow}
        chipFilterQuery={searchQuery}
        filterActive={recs.filterActive}
        activeFilterLowerKeys={recs.activeFilterLowerKeys}
        userTopGenreLower={recs.userTopGenreLower}
        toggleGenreFilter={recs.toggleGenreFilter}
        clearGenreFilters={recs.clearGenreFilters}
      />
    ) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <AddBookScreen query={searchQuery} onQueryChange={setSearchQuery} afterSearch={genreBar} />
      <RecsListPanel model={recs} />
    </div>
  );
}
