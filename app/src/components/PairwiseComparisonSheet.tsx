"use client";

import { useEffect, useMemo, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { useReadingNook } from "@/lib/app-state";
import type { BookId, SentimentBucket } from "@/lib/types";

function MiniBook({ bookId }: { bookId: BookId }) {
  const { state } = useReadingNook();
  const book = state.catalog[bookId];
  if (!book) return null;
  return (
    <div className="flex items-start gap-3">
      <CoverThumb
        src={book.coverUrl}
        alt=""
        sizes="36px"
        fallbackLetter={book.title}
        className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-border"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{book.title}</p>
        <p className="truncate text-xs text-foreground-muted">{book.author}</p>
      </div>
    </div>
  );
}

type PairwiseComparisonSheetProps = {
  newBookId: BookId;
  bucket: SentimentBucket;
  shareToFeed?: boolean;
  onDone: () => void;
};

export function PairwiseComparisonSheet({
  newBookId,
  bucket,
  shareToFeed = false,
  onDone,
}: PairwiseComparisonSheetProps) {
  const { state, actions } = useReadingNook();

  const bucketIds = useMemo(() => {
    const ids = state.bucketRankings[bucket] ?? [];
    return ids.filter((id) => id !== newBookId);
  }, [state.bucketRankings, bucket, newBookId]);

  const n = bucketIds.length;
  const approxMaxSteps = n > 0 ? Math.ceil(Math.log2(n + 1)) : 0;

  const [low, setLow] = useState(0);
  const [high, setHigh] = useState(n);
  const [comparisonsMade, setComparisonsMade] = useState(0);

  const mid = Math.floor((low + high) / 2);
  const comparisonBookId = n > 0 && low < high ? bucketIds[mid] : undefined;

  function answer(preferNew: boolean): void {
    if (low >= high) return;
    if (!comparisonBookId) return;

    const newLow = preferNew ? low : mid + 1;
    const newHigh = preferNew ? mid : high;
    const nextComparisonsMade = comparisonsMade + 1;

    setComparisonsMade(nextComparisonsMade);
    setLow(newLow);
    setHigh(newHigh);

    if (newLow >= newHigh) {
      actions.insertBookIntoBucketAtIndex(
        newBookId,
        bucket,
        newLow,
        shareToFeed ? { shareToFeed: true } : undefined,
      );
      onDone();
    }
  }

  // If opened incorrectly for an empty bucket, insert immediately.
  useEffect(() => {
    if (n === 0) {
      actions.insertBookIntoBucketAtIndex(
        newBookId,
        bucket,
        0,
        shareToFeed ? { shareToFeed: true } : undefined,
      );
      onDone();
    }
  }, [n, newBookId, bucket, shareToFeed, actions, onDone]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4">
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-4 pb-3 pt-3">
          <p className="font-serif text-lg font-semibold text-foreground">Which did you like more?</p>
          {approxMaxSteps > 0 && low < high ? (
            <p className="mt-1 text-xs text-foreground-muted">
              Comparison {Math.min(comparisonsMade + 1, approxMaxSteps)} of ~{approxMaxSteps}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 px-4 py-4">
          <button
            type="button"
            className="w-full rounded-2xl border border-border bg-card-surface px-3 py-4 text-left shadow-sm transition-colors hover:border-accent/40"
            onClick={() => answer(true)}
            disabled={!comparisonBookId}
          >
            <MiniBook bookId={newBookId} />
          </button>

          <button
            type="button"
            className="w-full rounded-2xl border border-border bg-card-surface px-3 py-4 text-left shadow-sm transition-colors hover:border-accent/40"
            onClick={() => answer(false)}
            disabled={!comparisonBookId}
          >
            {comparisonBookId ? <MiniBook bookId={comparisonBookId} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}

