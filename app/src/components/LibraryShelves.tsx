"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useReadingNook } from "@/lib/app-state";
import type { SentimentBucket, Shelf } from "@/lib/types";
import { itemsForShelf } from "@/lib/shelfItems";
import { ShelfSection } from "./ShelfSection";
import { PairwiseComparisonSheet } from "./PairwiseComparisonSheet";
import { BookDetailSheet } from "./BookDetailSheet";
import { FinishBookSheet } from "./FinishBookSheet";
import type { BookId } from "@/lib/types";

const FINISHED_PREVIEW_LIMIT = 12;

const SHELF_SECTION_ID: Record<Shelf, string> = {
  reading: "shelf-reading",
  finished: "shelf-finished",
  want_to_read: "shelf-want",
  did_not_finish: "shelf-dnf",
};

function parseShelfParam(value: string | null): Shelf | null {
  if (
    value === "reading" ||
    value === "finished" ||
    value === "want_to_read" ||
    value === "did_not_finish"
  ) {
    return value;
  }
  return null;
}

export function LibraryShelves() {
  const { state, actions } = useReadingNook();
  const searchParams = useSearchParams();
  const shelfParam = parseShelfParam(searchParams.get("shelf"));
  const [detailBookId, setDetailBookId] = useState<BookId | null>(null);
  const [finishBookId, setFinishBookId] = useState<BookId | null>(null);
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: string | null;
    bucket: SentimentBucket | null;
    shareToFeed?: boolean;
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
  const didNotFinish = useMemo(
    () => itemsForShelf(state.userBooks, state.catalog, "did_not_finish"),
    [state.userBooks, state.catalog],
  );

  const libraryEmpty =
    reading.length === 0 &&
    finished.length === 0 &&
    want.length === 0 &&
    didNotFinish.length === 0;

  useEffect(() => {
    if (!shelfParam || libraryEmpty) return;
    const id = SHELF_SECTION_ID[shelfParam];
    const el = document.getElementById(id);
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [shelfParam, libraryEmpty, reading.length, finished.length, want.length, didNotFinish.length]);

  const openDetail = (bookId: BookId) => {
    const ub = state.userBooks[bookId];
    if (!ub) return;
    if (ub.shelf === "finished" && !ub.sentimentBucket) {
      const hasRanking = (["liked", "okay", "disliked"] as SentimentBucket[]).some(
        (b) => state.bucketRankings[b]?.includes(bookId),
      );
      if (!hasRanking) {
        setFinishBookId(bookId);
        return;
      }
    }
    setDetailBookId(bookId);
  };

  return (
    <div className="flex flex-col gap-10">
      {libraryEmpty ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center shadow-inner">
          <p className="font-medium text-foreground">Your library is empty</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">
            Search the catalog or open recommendations to shelve your first book.
          </p>
          <Link
            href="/add"
            className="mt-4 inline-flex min-h-11 min-w-[8.5rem] items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
          >
            Go to Add
          </Link>
        </div>
      ) : null}
      <ShelfSection
        sectionId={SHELF_SECTION_ID.reading}
        title="Currently Reading"
        variant="reading"
        items={reading}
        emptyTitle="Nothing in progress"
        emptyBody="When you shelve a book as currently reading, it will appear here in a cozy row you can scroll sideways."
        onStartPairwise={(bookId, bucket) => setPairwise({ open: true, bookId, bucket })}
        onOpenDetail={openDetail}
      />
      <ShelfSection
        sectionId={SHELF_SECTION_ID.finished}
        title="Finished"
        variant="finished"
        items={finishedPreview}
        emptyTitle="No finished books yet"
        emptyBody="Finished titles land here with room for a sentiment and a simple score when you are ready."
        onStartPairwise={(bookId, bucket) => setPairwise({ open: true, bookId, bucket })}
        onOpenDetail={openDetail}
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
        sectionId={SHELF_SECTION_ID.want_to_read}
        title="Want to Read"
        variant="want"
        items={want}
        emptyTitle="Your wishlist is empty"
        emptyBody="Books you want to read will stack here—unhurried, one scroll at a time."
        onStartPairwise={(bookId, bucket) => setPairwise({ open: true, bookId, bucket })}
        onOpenDetail={openDetail}
      />
      <ShelfSection
        sectionId={SHELF_SECTION_ID.did_not_finish}
        title="Did Not Finish"
        variant="dnf"
        items={didNotFinish}
        emptyTitle="No unfinished reads here"
        emptyBody="Books you set aside partway will appear here—no rating required, just a quiet shelf."
        onStartPairwise={(bookId, bucket) => setPairwise({ open: true, bookId, bucket })}
        onOpenDetail={openDetail}
      />

      {detailBookId && state.catalog[detailBookId] && state.userBooks[detailBookId] ? (
        <BookDetailSheet
          bookId={detailBookId}
          onClose={() => setDetailBookId(null)}
          onStartPairwise={(bookId, bucket, options) => {
            setDetailBookId(null);
            setPairwise({
              open: true,
              bookId,
              bucket,
              shareToFeed: options?.shareToFeed,
            });
          }}
        />
      ) : null}

      {finishBookId && state.catalog[finishBookId] && state.userBooks[finishBookId] ? (
        <FinishBookSheet
          bookId={finishBookId}
          book={state.catalog[finishBookId]}
          userBook={state.userBooks[finishBookId]}
          actions={actions}
          onStartPairwise={(bucket) => {
            setFinishBookId(null);
            setPairwise({ open: true, bookId: finishBookId, bucket });
          }}
          onClose={() => setFinishBookId(null)}
        />
      ) : null}

      {pairwise.open && pairwise.bookId && pairwise.bucket ? (
        <PairwiseComparisonSheet
          newBookId={pairwise.bookId}
          bucket={pairwise.bucket}
          shareToFeed={pairwise.shareToFeed}
          onDone={() => setPairwise({ open: false, bookId: null, bucket: null })}
        />
      ) : null}
    </div>
  );
}
