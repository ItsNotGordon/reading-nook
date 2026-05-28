"use client";

import { CoverThumb } from "@/components/CoverThumb";
import { FriendShelfBookRow } from "@/components/FriendShelfBookRow";
import { OpenBookScoreBadge } from "@/components/OpenBookScoreBadge";
import { RatingRankCircle } from "@/components/RatingRankCircle";
import { profileShelfBarRows } from "@/components/ProfileShelfBars";
import { groupFriendShelfBooks } from "@/lib/friendLibrary";
import type { FriendProfileSummary, FriendRatingRow } from "@/lib/friendProfileSummary";
import type { BookId, Shelf } from "@/lib/types";

const SUMMARY_CLASS =
  "flex w-full cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-border/80 bg-background px-3 py-2.5 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/20 active:bg-accent-soft/40 [&::-webkit-details-marker]:hidden";

type FriendProfileLibraryCardProps = {
  summary: FriendProfileSummary;
  onBookPress: (bookId: BookId) => void;
};

export function FriendProfileLibraryCard({ summary, onBookPress }: FriendProfileLibraryCardProps) {
  const grouped = groupFriendShelfBooks(summary.books);
  const rows = profileShelfBarRows({
    reading: summary.readingCount,
    finished: summary.finishedCount,
    wantToRead: summary.wantCount,
  });

  const renderFinishedList = (ratings: FriendRatingRow[]) => {
    if (ratings.length === 0) {
      const fallback = grouped.finished;
      if (fallback.length === 0) {
        return (
          <p className="px-1 py-2 text-sm text-foreground-muted">Nothing on this shelf yet.</p>
        );
      }
      return (
        <ul className="space-y-2">
          {fallback.map((b) => (
            <FriendShelfBookRow key={b.id} book={b} onPress={() => onBookPress(b.id)} />
          ))}
        </ul>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card-surface shadow-sm ring-1 ring-black/[0.03]">
        <ol>
          {ratings.map((row, idx) => (
            <li key={row.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => onBookPress(row.id)}
                className="flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-accent-soft/25 active:bg-accent-soft/35"
              >
                <RatingRankCircle rank={idx + 1} />
                <CoverThumb
                  src={row.coverUrl}
                  alt=""
                  sizes="36px"
                  fallbackLetter={row.title}
                  className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                  <p className="truncate text-xs text-foreground-muted">{row.author}</p>
                </div>
                {row.derivedScore != null && row.sentimentBucket ? (
                  <OpenBookScoreBadge
                    score={row.derivedScore}
                    bucket={row.sentimentBucket}
                    width={52}
                    height={36}
                  />
                ) : (
                  <span
                    className="flex h-[36px] w-[52px] shrink-0 items-center justify-center text-sm font-semibold text-foreground-muted"
                    aria-label="Unrated"
                  >
                    —
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  };

  const renderShelfBooks = (shelf: Shelf) => {
    const items = grouped[shelf];
    if (items.length === 0) {
      return <p className="px-1 py-2 text-sm text-foreground-muted">Nothing on this shelf yet.</p>;
    }
    return (
      <ul className="space-y-2">
        {items.map((b) => (
          <FriendShelfBookRow
            key={b.id}
            book={b}
            compactReading={shelf === "reading"}
            onPress={() => onBookPress(b.id)}
          />
        ))}
      </ul>
    );
  };

  return (
    <section className="relative z-20 rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Library</p>
      <p className="mt-1 text-[11px] text-foreground-muted">
        Tap a shelf to expand, then tap a book to compare with you.
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <details
            key={row.shelf}
            name="friend-library-shelf"
            className="group rounded-xl border border-transparent open:border-border/60"
          >
            <summary className={SUMMARY_CLASS}>
              <span className="text-sm font-medium text-foreground">{row.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-foreground-muted">
                  {row.count}
                </span>
                <span
                  className="text-foreground-muted transition-transform group-open:rotate-180"
                  aria-hidden
                >
                  ▾
                </span>
              </span>
            </summary>
            <div className="px-0.5 pb-2 pt-2">
              {row.shelf === "finished"
                ? renderFinishedList(summary.ratings)
                : renderShelfBooks(row.shelf)}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
