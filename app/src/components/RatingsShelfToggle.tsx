"use client";

import { RATINGS_SHELF_ORDER, shelfDisplayName, shelfToggleShortLabel } from "@/lib/shelves";
import type { Shelf } from "@/lib/types";

type RatingsShelfToggleProps = {
  selected: Shelf;
  onSelect: (shelf: Shelf) => void;
};

export function RatingsShelfToggle({ selected, onSelect }: RatingsShelfToggleProps) {
  return (
    <div
      className="flex gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Library shelf"
    >
      {RATINGS_SHELF_ORDER.map((shelf) => {
        const active = selected === shelf;
        const label = shelfToggleShortLabel(shelf);
        return (
          <button
            key={shelf}
            type="button"
            role="tab"
            aria-selected={active}
            title={shelfDisplayName(shelf)}
            onClick={() => onSelect(shelf)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              active
                ? "bg-accent text-white"
                : "text-foreground-muted hover:bg-accent-soft/30 hover:text-foreground"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
