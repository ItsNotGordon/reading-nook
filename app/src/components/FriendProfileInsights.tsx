"use client";

import { useEffect, useRef } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { FriendShelfBookRow } from "@/components/FriendShelfBookRow";
import { ProfileFavoritesSection } from "@/components/ProfileFavoritesSection";
import { ProfileRecentInsights } from "@/components/ProfileRecentInsights";
import { ProfileShelfBars, profileShelfBarRows } from "@/components/ProfileShelfBars";
import { groupFriendShelfBooks } from "@/lib/friendLibrary";
import type { FriendProfileSummary } from "@/lib/friendProfileSummary";
import { sentimentLabel, sentimentTextColor } from "@/lib/sentiment-display";
import type { SentimentBucket, Shelf } from "@/lib/types";

const SHELF_LABELS: Record<Shelf, string> = {
  reading: "Currently reading",
  finished: "Finished",
  want_to_read: "Want to read",
};

const RATING_BUCKET_ORDER: SentimentBucket[] = ["liked", "okay", "disliked"];

function scoreColor(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#426447]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

type FriendProfileInsightsProps = {
  summary: FriendProfileSummary;
  focusShelf: Shelf | null;
  shelvesOpen: boolean;
  ratingsOpen: boolean;
  onShelvesOpenChange: (open: boolean) => void;
  onRatingsOpenChange: (open: boolean) => void;
  onShelfRowFocus: (shelf: Shelf) => void;
};

export function FriendProfileInsights({
  summary,
  focusShelf,
  shelvesOpen,
  ratingsOpen,
  onShelvesOpenChange,
  onRatingsOpenChange,
  onShelfRowFocus,
}: FriendProfileInsightsProps) {
  const grouped = groupFriendShelfBooks(summary.books);
  const ratingsByBucket = RATING_BUCKET_ORDER.map((bucket) => ({
    bucket,
    rows: summary.ratings.filter((r) => r.sentimentBucket === bucket),
  }));
  const hasRatings = summary.ratings.length > 0;
  const libraryShelves = (["reading", "finished", "want_to_read"] as const).filter(
    (shelf) => shelf !== "finished" || !hasRatings,
  );
  const hasLibraryContent = libraryShelves.some((shelf) => grouped[shelf].length > 0);

  const shelfSectionRef = useRef<HTMLDetailsElement>(null);
  const ratingsSectionRef = useRef<HTMLDetailsElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const wantRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusShelf) return;
    if (focusShelf === "finished") {
      onRatingsOpenChange(true);
      ratingsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }
    onShelvesOpenChange(true);
    shelfSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const target =
      focusShelf === "reading" ? readingRef.current : focusShelf === "want_to_read" ? wantRef.current : null;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focusShelf, onRatingsOpenChange, onShelvesOpenChange]);

  const ratedCount =
    summary.sentimentInsights.reduce((s, i) => s + i.count, 0) || summary.finishedCount;

  if (summary.totalCount === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-card-surface/50 px-4 py-6 text-center text-sm text-foreground-muted">
        No books on their shelves yet.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-left">
      <ProfileShelfBars
        rows={profileShelfBarRows({
          reading: summary.readingCount,
          finished: summary.finishedCount,
          wantToRead: summary.wantCount,
        })}
        mode="friend"
        onFriendShelfFocus={onShelfRowFocus}
      />

      <ProfileFavoritesSection
        title="Their Favorites"
        favoriteBook={summary.favoriteBook}
        topGenres={summary.topGenres}
        topAuthors={summary.topAuthors}
        genreLinkBase=""
        authorLinkBase=""
      />

      <ProfileRecentInsights
        insights={summary.sentimentInsights}
        ratedFinishedCount={ratedCount}
        mode="friend"
      />

      {hasRatings ? (
        <details
          ref={ratingsSectionRef}
          className="group rounded-2xl border border-border bg-card-surface/95 shadow-sm"
          open={ratingsOpen}
          onToggle={(e) => onRatingsOpenChange((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Their ratings</span>
              <span className="text-foreground-muted group-open:rotate-180">▾</span>
            </div>
          </summary>
          <div className="space-y-4 border-t border-border/80 px-4 pb-4 pt-2">
            {ratingsByBucket.map(({ bucket, rows }) =>
              rows.length > 0 ? (
                <div key={bucket}>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wider ${sentimentTextColor(bucket)}`}
                  >
                    {sentimentLabel(bucket)}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center gap-3 rounded-xl border border-border/80 bg-background p-2.5"
                      >
                        <CoverThumb
                          src={row.coverUrl}
                          alt=""
                          sizes="40px"
                          fallbackLetter={row.title}
                          className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-border"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                          <p className="truncate text-xs text-foreground-muted">{row.author}</p>
                        </div>
                        {row.derivedScore != null ? (
                          <p className={`shrink-0 text-sm font-semibold tabular-nums ${scoreColor(bucket)}`}>
                            {row.derivedScore.toFixed(1)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        </details>
      ) : null}

      {hasLibraryContent ? (
        <details
          ref={shelfSectionRef}
          className="group rounded-2xl border border-border bg-card-surface/95 shadow-sm"
          open={shelvesOpen}
          onToggle={(e) => onShelvesOpenChange((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Their shelves</span>
              <span className="text-foreground-muted group-open:rotate-180">▾</span>
            </div>
          </summary>
          <div className="space-y-4 border-t border-border/80 px-4 pb-4 pt-2">
            {libraryShelves.map((shelf) => {
              const items = grouped[shelf];
              if (items.length === 0) return null;
              const subRef =
                shelf === "reading" ? readingRef : shelf === "want_to_read" ? wantRef : undefined;
              return (
                <div key={shelf} ref={subRef}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    {SHELF_LABELS[shelf]}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {items.map((b) => (
                      <FriendShelfBookRow key={b.id} book={b} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}
