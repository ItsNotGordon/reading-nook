"use client";

import { useState } from "react";
import type { RecommendationEngine } from "@/lib/appNativeRecommendations";
import type { RecommendationsPoolModel } from "@/lib/useRecommendationsPool";

type FilterPanel = "genre" | "year" | "system" | null;

type FilterToolbarProps = {
  openPanel: FilterPanel;
  onTogglePanel: (panel: FilterPanel) => void;
  genreProps: Pick<
    RecommendationsPoolModel,
    | "sortedFilterGenres"
    | "genresForChipRow"
    | "filterActive"
    | "activeFilterLowerKeys"
    | "userTopGenreLower"
    | "toggleGenreFilter"
    | "clearGenreFilters"
  > | null;
  minYear: string;
  maxYear: string;
  onMinYearChange: (v: string) => void;
  onMaxYearChange: (v: string) => void;
  engine: RecommendationEngine;
  onEngineChange: (e: RecommendationEngine) => void;
  onClearAll: () => void;
};

const btnBase =
  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors";
const btnIdle = "border-border/80 bg-background text-foreground-muted";
const btnOpen = "border-accent/60 bg-accent-soft/20 text-accent";
const btnActive = "border-accent bg-accent text-white";

export function FilterToolbar({
  openPanel,
  onTogglePanel,
  genreProps,
  minYear,
  maxYear,
  onMinYearChange,
  onMaxYearChange,
  engine,
  onEngineChange,
  onClearAll,
}: FilterToolbarProps) {
  const [genreSearch, setGenreSearch] = useState("");

  const genreFilterActive = genreProps?.filterActive ?? false;
  const yearFilterActive = minYear !== "" || maxYear !== "";
  const systemNonDefault = engine !== "hybrid";
  const anyFilterActive = genreFilterActive || yearFilterActive || systemNonDefault;

  function btnClass(panel: FilterPanel, isActive: boolean) {
    if (openPanel === panel) return `${btnBase} ${btnOpen}`;
    if (isActive) return `${btnBase} ${btnActive}`;
    return `${btnBase} ${btnIdle}`;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onTogglePanel(openPanel === "genre" ? null : "genre")}
          className={btnClass("genre", genreFilterActive)}
          aria-expanded={openPanel === "genre"}
        >
          Genre{genreFilterActive ? " *" : ""}
        </button>
        <button
          type="button"
          onClick={() => onTogglePanel(openPanel === "year" ? null : "year")}
          className={btnClass("year", yearFilterActive)}
          aria-expanded={openPanel === "year"}
        >
          Published Year{yearFilterActive ? " *" : ""}
        </button>
        <button
          type="button"
          onClick={() => onTogglePanel(openPanel === "system" ? null : "system")}
          className={btnClass("system", systemNonDefault)}
          aria-expanded={openPanel === "system"}
        >
          System{systemNonDefault ? " *" : ""}
        </button>
        {anyFilterActive ? (
          <button
            type="button"
            onClick={onClearAll}
            className="ml-auto shrink-0 text-xs font-semibold text-red-500 active:text-red-400"
          >
            Clear All
          </button>
        ) : null}
      </div>

      {openPanel === "genre" && genreProps ? (
        <GenrePanel genreSearch={genreSearch} onGenreSearchChange={setGenreSearch} {...genreProps} />
      ) : null}

      {openPanel === "year" ? (
        <YearPanel
          minYear={minYear}
          maxYear={maxYear}
          onMinYearChange={onMinYearChange}
          onMaxYearChange={onMaxYearChange}
        />
      ) : null}

      {openPanel === "system" ? (
        <SystemPanel engine={engine} onEngineChange={onEngineChange} />
      ) : null}
    </div>
  );
}

function GenrePanel({
  genreSearch,
  onGenreSearchChange,
  sortedFilterGenres,
  genresForChipRow,
  filterActive,
  activeFilterLowerKeys,
  userTopGenreLower,
  toggleGenreFilter,
  clearGenreFilters,
}: {
  genreSearch: string;
  onGenreSearchChange: (v: string) => void;
} & Pick<
  RecommendationsPoolModel,
  | "sortedFilterGenres"
  | "genresForChipRow"
  | "filterActive"
  | "activeFilterLowerKeys"
  | "userTopGenreLower"
  | "toggleGenreFilter"
  | "clearGenreFilters"
>) {
  if (sortedFilterGenres.length === 0) return null;

  const norm = genreSearch.trim().toLowerCase();
  const filtered = norm
    ? genresForChipRow.filter((g) => g.toLowerCase().includes(norm))
    : genresForChipRow;

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-card-surface/40 p-2.5">
      <input
        type="search"
        autoComplete="off"
        placeholder="Search genres..."
        value={genreSearch}
        onChange={(e) => onGenreSearchChange(e.target.value)}
        className="h-8 w-full rounded-lg border border-border bg-background px-2.5 text-xs text-foreground outline-none placeholder:text-foreground-muted/60 focus:border-accent/50"
      />
      {norm && filtered.length === 0 ? (
        <p className="text-xs text-foreground-muted">No genres match that search.</p>
      ) : null}
      <div className="flex min-w-0 w-full flex-wrap gap-2 pb-0.5">
        <button
          type="button"
          onClick={clearGenreFilters}
          aria-pressed={!filterActive}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            !filterActive
              ? "border-accent bg-accent text-white"
              : "border-border/80 bg-background text-foreground-muted"
          }`}
        >
          All
        </button>
        {filtered.map((label) => {
          const k = label.toLowerCase();
          const selected = activeFilterLowerKeys.includes(k);
          const isTop = userTopGenreLower.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleGenreFilter(k)}
              aria-pressed={selected}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
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

function YearPanel({
  minYear,
  maxYear,
  onMinYearChange,
  onMaxYearChange,
}: {
  minYear: string;
  maxYear: string;
  onMinYearChange: (v: string) => void;
  onMaxYearChange: (v: string) => void;
}) {
  const hasFilter = minYear !== "" || maxYear !== "";
  const parsedMin = minYear !== "" ? parseInt(minYear, 10) : null;
  const parsedMax = maxYear !== "" ? parseInt(maxYear, 10) : null;
  const invalid =
    parsedMin != null &&
    !Number.isNaN(parsedMin) &&
    parsedMax != null &&
    !Number.isNaN(parsedMax) &&
    parsedMin > parsedMax;

  let summary: string | null = null;
  if (!invalid) {
    if (parsedMin != null && !Number.isNaN(parsedMin) && (parsedMax == null || Number.isNaN(parsedMax))) {
      summary = `Published after ${parsedMin}`;
    } else if ((parsedMin == null || Number.isNaN(parsedMin)) && parsedMax != null && !Number.isNaN(parsedMax)) {
      summary = `Published before ${parsedMax}`;
    } else if (parsedMin != null && !Number.isNaN(parsedMin) && parsedMax != null && !Number.isNaN(parsedMax)) {
      summary = `Published ${parsedMin}–${parsedMax}`;
    }
  }

  return (
    <div className="space-y-1 rounded-xl border border-border/60 bg-card-surface/40 p-2.5">
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          placeholder="Min"
          value={minYear}
          onChange={(e) => onMinYearChange(e.target.value)}
          className="h-8 w-[5.5rem] rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none placeholder:text-foreground-muted/60 focus:border-accent/50"
        />
        <span className="text-xs text-foreground-muted">–</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="Max"
          value={maxYear}
          onChange={(e) => onMaxYearChange(e.target.value)}
          className="h-8 w-[5.5rem] rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none placeholder:text-foreground-muted/60 focus:border-accent/50"
        />
        {hasFilter ? (
          <button
            type="button"
            onClick={() => {
              onMinYearChange("");
              onMaxYearChange("");
            }}
            className="shrink-0 text-xs font-semibold text-accent active:text-accent/70"
          >
            Clear
          </button>
        ) : null}
      </div>
      {invalid ? (
        <p className="text-xs font-medium text-red-500">Min year must be before max year.</p>
      ) : summary ? (
        <p className="text-xs text-foreground-muted">{summary}</p>
      ) : null}
    </div>
  );
}

function SystemPanel({
  engine,
  onEngineChange,
}: {
  engine: RecommendationEngine;
  onEngineChange: (e: RecommendationEngine) => void;
}) {
  const options: { value: RecommendationEngine; label: string }[] = [
    { value: "hybrid", label: "For You" },
    { value: "tfidf", label: "Similar Vibes" },
  ];

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card-surface/40 p-2.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onEngineChange(opt.value)}
          aria-pressed={engine === opt.value}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            engine === opt.value
              ? "border-accent bg-accent text-white"
              : "border-border/80 bg-background text-foreground-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
