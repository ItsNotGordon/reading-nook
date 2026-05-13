"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AddBookScreen, MIN_QUERY_LENGTH } from "@/components/AddBookScreen";
import { RecsScreen } from "@/components/RecsScreen";

type Segment = "search" | "recs";

export function AddTabClient() {
  const searchParams = useSearchParams();
  const tabIsRecs = searchParams.get("tab") === "recs";
  /** User segment choice; null means follow URL `tab=recs` when present, else Search. */
  const [segmentOverride, setSegmentOverride] = useState<Segment | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = searchQuery.trim();
  const queryReady = normalizedQuery.length >= MIN_QUERY_LENGTH;

  const effectiveSegment: Segment = (() => {
    if (queryReady) return "search";
    if (segmentOverride !== null) return segmentOverride;
    if (tabIsRecs) return "recs";
    return "search";
  })();

  const showSegmentToggle = !queryReady;
  const showSearchPanel = queryReady || effectiveSegment === "search";
  const showRecsPanel = !queryReady && effectiveSegment === "recs";

  const segBtn =
    "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

  return (
    <div className="flex flex-col gap-3">
      {showSegmentToggle ? (
        <div
          className="flex rounded-xl border border-border bg-card-surface p-0.5 shadow-inner"
          role="tablist"
          aria-label="Add books"
        >
          <button
            type="button"
            role="tab"
            aria-selected={effectiveSegment === "search"}
            onClick={() => setSegmentOverride("search")}
            className={`${segBtn} ${
              effectiveSegment === "search"
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Search
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={effectiveSegment === "recs"}
            onClick={() => setSegmentOverride("recs")}
            className={`${segBtn} ${
              effectiveSegment === "recs"
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            Recs
          </button>
        </div>
      ) : null}

      {showSearchPanel ? (
        <AddBookScreen query={searchQuery} onQueryChange={setSearchQuery} />
      ) : null}
      {showRecsPanel ? <RecsScreen /> : null}
    </div>
  );
}
