"use client";

import {
  SORT_LABELS,
  SORT_LABELS_SHORT,
  sortOptionsForShelf,
  type RatingsSortKey,
} from "@/lib/ratingsShelfSort";
import type { Shelf } from "@/lib/types";

type RatingsSortSelectProps = {
  shelf: Shelf;
  value: RatingsSortKey;
  onChange: (sort: RatingsSortKey) => void;
  disabled?: boolean;
};

export function RatingsSortSelect({ shelf, value, onChange, disabled }: RatingsSortSelectProps) {
  const options = sortOptionsForShelf(shelf);

  return (
    <select
      id="ratings-sort"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as RatingsSortKey)}
      className="max-w-[6.75rem] shrink-0 rounded-full border border-border/70 bg-card-surface/80 py-1 pl-2 pr-6 text-[11px] font-medium text-foreground outline-none focus:border-accent/40 disabled:opacity-50"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 20 20' fill='%23666'%3E%3Cpath d='M5.5 7.5L10 12l4.5-4.5'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.35rem center",
        appearance: "none",
      }}
      aria-label={`Sort: ${SORT_LABELS[value]}`}
    >
      {options.map((key) => (
        <option key={key} value={key}>
          {SORT_LABELS_SHORT[key]}
        </option>
      ))}
    </select>
  );
}
