"use client";

import { useMemo, useState } from "react";
import { MAX_CATALOG_GENRES } from "@/lib/mergeCatalogGenres";
import { ACCEPTED_GENRES } from "@/lib/genreVocabulary";

type GenreChipPickerProps = {
  value: string[];
  onChange: (genres: string[]) => void;
  max?: number;
  /** Show compact search above chips (default true). */
  searchable?: boolean;
};

export function GenreChipPicker({
  value,
  onChange,
  max = MAX_CATALOG_GENRES,
  searchable = true,
}: GenreChipPickerProps) {
  const [search, setSearch] = useState("");
  const selectedLower = useMemo(() => new Set(value.map((g) => g.toLowerCase())), [value]);
  const searchNorm = search.trim().toLowerCase();

  const chips = useMemo(() => {
    if (!searchNorm) return [...ACCEPTED_GENRES];
    return ACCEPTED_GENRES.filter((label) => label.toLowerCase().includes(searchNorm));
  }, [searchNorm]);

  const atMax = value.length >= max;

  const toggle = (label: string) => {
    const key = label.toLowerCase();
    if (selectedLower.has(key)) {
      onChange(value.filter((g) => g.toLowerCase() !== key));
      return;
    }
    if (atMax) return;
    onChange([...value, label]);
  };

  return (
    <div className="space-y-2">
      {searchable ? (
        <div className="space-y-1">
          <label htmlFor="genre-chip-search" className="sr-only">
            Search genres
          </label>
          <input
            id="genre-chip-search"
            type="search"
            autoComplete="off"
            placeholder="Search genres…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-10 w-full rounded-xl border border-border bg-card-surface px-3 py-2 text-sm text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
          />
          {searchNorm && chips.length === 0 ? (
            <p className="text-xs text-foreground-muted">No genres match that search.</p>
          ) : null}
        </div>
      ) : null}

      {atMax ? (
        <p className="text-xs text-foreground-muted">Up to {max} genres per book.</p>
      ) : null}

      <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto overscroll-contain pb-1">
        {chips.map((label) => {
          const selected = selectedLower.has(label.toLowerCase());
          const disabled = !selected && atMax;
          return (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => toggle(label)}
              aria-pressed={selected}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                selected
                  ? "border-[#426447] bg-[#e8f2ea] text-[#426447]"
                  : disabled
                    ? "cursor-not-allowed border-border/50 bg-background/50 text-foreground-muted/50"
                    : "border-border/80 bg-background text-foreground-muted active:bg-accent-soft/30"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
