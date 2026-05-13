"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useReadingNook } from "@/lib/app-state";
import type { Book, SentimentBucket, Shelf, UserBook } from "@/lib/types";
import type { ShelfItem } from "./ShelfSection";
import { ShelfSection } from "./ShelfSection";
import { PairwiseComparisonSheet } from "./PairwiseComparisonSheet";

const FINISHED_PREVIEW_LIMIT = 12;

function itemsForShelf(
  userBooks: Partial<Record<string, UserBook>>,
  catalog: Record<string, Book>,
  shelf: Shelf,
): ShelfItem[] {
  const out: ShelfItem[] = [];
  for (const ub of Object.values(userBooks)) {
    if (!ub || ub.shelf !== shelf) continue;
    const book = catalog[ub.bookId];
    if (book) out.push({ book, userBook: ub });
  }
  if (shelf === "finished") {
    // Newest finish action first. Prefer finishedSortAt, then finishedAt, then addedAt.
    out.sort((a, b) => {
      const aRaw = a.userBook.finishedSortAt ?? a.userBook.finishedAt ?? a.userBook.addedAt;
      const bRaw = b.userBook.finishedSortAt ?? b.userBook.finishedAt ?? b.userBook.addedAt;
      const aTs = Number.isFinite(Date.parse(aRaw)) ? Date.parse(aRaw) : -Infinity;
      const bTs = Number.isFinite(Date.parse(bRaw)) ? Date.parse(bRaw) : -Infinity;
      if (bTs !== aTs) return bTs - aTs;
      const aAddedTs = Number.isFinite(Date.parse(a.userBook.addedAt))
        ? Date.parse(a.userBook.addedAt)
        : -Infinity;
      const bAddedTs = Number.isFinite(Date.parse(b.userBook.addedAt))
        ? Date.parse(b.userBook.addedAt)
        : -Infinity;
      if (bAddedTs !== aAddedTs) return bAddedTs - aAddedTs;
      // Stable tie-breaker (keeps deterministic order when timestamps match)
      return b.userBook.bookId.localeCompare(a.userBook.bookId);
    });
  } else {
    out.sort((a, b) => a.userBook.addedAt.localeCompare(b.userBook.addedAt));
  }
  return out;
}

export function LibraryShelves() {
  const { state } = useReadingNook();
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: string | null;
    bucket: SentimentBucket | null;
  }>({ open: false, bookId: null, bucket: null });

  const reading = useMemo(
    () => itemsForShelf(state.userBooks, state.catalog, "reading"),
    [state.userBooks, state.catalog],
  );
  const finished = useMemo(
    () => itemsForShelf(state.userBooks, state.catalog, "finished"),
    [state.userBooks, state.catalog],
  );
  const finishedPreview = useMemo(
    () => finished.slice(0, FINISHED_PREVIEW_LIMIT),
    [finished],
  );
  const want = useMemo(
    () => itemsForShelf(state.userBooks, state.catalog, "want_to_read"),
    [state.userBooks, state.catalog],
  );

  return (
    <div className="flex flex-col gap-10">
      <ShelfSection
        title="Currently Reading"
        variant="reading"
        items={reading}
        emptyTitle="Nothing in progress"
        emptyBody="When you shelve a book as currently reading, it will appear here in a cozy row you can scroll sideways."
        onStartPairwise={(bookId, bucket) => setPairwise({ open: true, bookId, bucket })}
      />
      <ShelfSection
        title="Finished"
        variant="finished"
        items={finishedPreview}
        emptyTitle="No finished books yet"
        emptyBody="Finished titles land here with room for a sentiment and a simple score when you are ready."
        onStartPairwise={(bookId, bucket) => setPairwise({ open: true, bookId, bucket })}
        headerMeta={
          <div className="flex items-center gap-2 text-[11px] font-medium">
            {finished.length > FINISHED_PREVIEW_LIMIT ? (
              <span className="text-foreground-muted">
                Showing {FINISHED_PREVIEW_LIMIT} of {finished.length}
              </span>
            ) : null}
            <Link
              href="/ratings"
              className="text-accent underline-offset-2 hover:underline"
              aria-label="View all finished books in Ratings"
            >
              View all
            </Link>
          </div>
        }
      />
      <ShelfSection
        title="Want to Read"
        variant="want"
        items={want}
        emptyTitle="Your wishlist is empty"
        emptyBody="Books you want to read will stack here—unhurried, one scroll at a time."
        onStartPairwise={(bookId, bucket) => setPairwise({ open: true, bookId, bucket })}
      />

      {pairwise.open && pairwise.bookId && pairwise.bucket ? (
        <PairwiseComparisonSheet
          newBookId={pairwise.bookId}
          bucket={pairwise.bucket}
          onDone={() => setPairwise({ open: false, bookId: null, bucket: null })}
        />
      ) : null}
    </div>
  );
}
