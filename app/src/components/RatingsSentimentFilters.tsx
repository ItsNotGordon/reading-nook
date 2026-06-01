"use client";

import {
  sentimentFilterPillActive,
  sentimentFilterPillIdle,
  sentimentLabel,
} from "@/lib/sentiment-display";
import type { SentimentBucket } from "@/lib/types";

type RatingsSentimentFiltersProps = {
  active: SentimentBucket | null;
  onChange: (bucket: SentimentBucket | null) => void;
};

const PILL_BASE =
  "inline-flex min-h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition-colors";

function LikedIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-3.5 w-3.5 ${className}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M9.653 16.915l-.005-.003-.019-.01a20.76 20.76 0 01-1.539-.844C5.36 14.165 2.5 11.38 2.5 7.75 2.5 5.56 4.28 3.75 6.5 3.75c1.32 0 2.55.58 3.4 1.5.85-.92 2.08-1.5 3.4-1.5 2.22 0 4 1.81 4 4 0 3.63-2.86 6.415-5.594 8.308l-.019.01-.005.003-.653.37z" />
    </svg>
  );
}

function OkayIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-current ${className}`}
      aria-hidden
    />
  );
}

function DislikedIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-3.5 w-3.5 ${className}`} viewBox="0 0 20 20" aria-hidden>
      <path
        fill="currentColor"
        d="M9.653 16.915l-.005-.003-.019-.01a20.76 20.76 0 01-1.539-.844C5.36 14.165 2.5 11.38 2.5 7.75 2.5 5.56 4.28 3.75 6.5 3.75c1.32 0 2.55.58 3.4 1.5.85-.92 2.08-1.5 3.4-1.5 2.22 0 4 1.81 4 4 0 3.63-2.86 6.415-5.594 8.308l-.019.01-.005.003-.653.37z"
      />
      <path
        d="M5 5l10 10"
        stroke="var(--background, #fbf9f9)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RatingsSentimentFilters({ active, onChange }: RatingsSentimentFiltersProps) {
  const buckets: SentimentBucket[] = ["liked", "okay", "disliked"];

  return (
    <div
      className="-mx-0.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Filter by how you felt"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === null}
        onClick={() => onChange(null)}
        className={`${PILL_BASE} ${
          active === null ? sentimentFilterPillActive("all") : "border-border bg-card-surface text-foreground"
        }`}
      >
        All
      </button>
      {buckets.map((bucket) => {
        const selected = active === bucket;
        return (
          <button
            key={bucket}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(bucket)}
            className={`${PILL_BASE} ${
              selected ? sentimentFilterPillActive(bucket) : sentimentFilterPillIdle(bucket)
            }`}
          >
            {bucket === "liked" ? <LikedIcon /> : null}
            {bucket === "okay" ? <OkayIcon /> : null}
            {bucket === "disliked" ? <DislikedIcon /> : null}
            {sentimentLabel(bucket)}
          </button>
        );
      })}
    </div>
  );
}
