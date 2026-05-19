"use client";

import type { RecommendationsPoolModel } from "@/lib/useRecommendationsPool";

type RecsGenreFilterBarProps = Pick<
  RecommendationsPoolModel,
  | "sortedFilterGenres"
  | "genresForChipRow"
  | "genreSearch"
  | "setGenreSearch"
  | "genreSearchNorm"
  | "filterActive"
  | "activeFilterLowerKeys"
  | "userTopGenreLower"
  | "toggleGenreFilter"
  | "clearGenreFilters"
>;

export function RecsGenreFilterBar({
  sortedFilterGenres,
  genresForChipRow,
  genreSearch,
  setGenreSearch,
  genreSearchNorm,
  filterActive,
  activeFilterLowerKeys,
  userTopGenreLower,
  toggleGenreFilter,
  clearGenreFilters,
}: RecsGenreFilterBarProps) {
  if (sortedFilterGenres.length === 0) return null;

  return (
    <div className="-mx-1 min-w-0 w-full space-y-2">
      <div className="px-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
          Filter recommendations by genre
        </p>
        <p className="mt-0.5 text-xs text-foreground-muted">
          Starred genres match your taste. Tap to filter.
        </p>
      </div>
      <div className="px-1">
        <label htmlFor="recs-genre-filter" className="sr-only">
          Search genres
        </label>
        <input
          id="recs-genre-filter"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Search genres…"
          value={genreSearch}
          onChange={(e) => setGenreSearch(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-card-surface px-3.5 py-2.5 text-base text-foreground shadow-inner outline-none ring-0 transition-shadow placeholder:text-foreground-muted/80 focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
        />
      </div>
      {genreSearchNorm && genresForChipRow.length === 0 ? (
        <p className="px-1 text-xs text-foreground-muted">No genres match that search.</p>
      ) : null}
      <div className="flex min-w-0 w-full flex-nowrap gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 touch-pan-x snap-x snap-mandatory [scrollbar-width:thin]">
        <button
          type="button"
          onClick={clearGenreFilters}
          aria-pressed={!filterActive}
          className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            !filterActive
              ? "border-accent bg-accent text-white"
              : "border-border/80 bg-background text-foreground-muted"
          }`}
        >
          All
        </button>
        {genresForChipRow.map((label) => {
          const k = label.toLowerCase();
          const selected = activeFilterLowerKeys.includes(k);
          const isTop = userTopGenreLower.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleGenreFilter(k)}
              aria-pressed={selected}
              className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                selected
                  ? "border-accent bg-accent text-white"
                  : isTop
                    ? "border-dashed border-accent/50 bg-background text-accent"
                    : "border-border/80 bg-background text-foreground-muted"
              }`}
            >
              {isTop && !selected ? "★ " : null}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
