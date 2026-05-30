"use client";

import { useEffect, useId, useMemo } from "react";
import { createPortal } from "react-dom";
import { CoverThumb } from "@/components/CoverThumb";
import { useReadingNook } from "@/lib/app-state";
import type { FriendBookSnapshot } from "@/lib/friendBookCompare";
import { yourBookSnapshot } from "@/lib/friendBookCompare";
import {
  predictRecommendedScore,
  type PredictedRecommendation,
} from "@/lib/predictRecommendedScore";
import { readingProgressDisplay } from "@/lib/readingProgressDisplay";
import { sentimentLabel, sentimentTextColor } from "@/lib/sentiment-display";
import type { BookId, SentimentBucket } from "@/lib/types";

type FriendBookCompareSheetProps = {
  bookId: BookId;
  friendDisplayName: string;
  friendBook: FriendBookSnapshot | null;
  onClose: () => void;
};

function scoreColor(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#426447]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

function formatFinishedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function shelfLabel(shelf: FriendBookSnapshot["shelf"]): string {
  if (shelf === "reading") return "Currently reading";
  if (shelf === "finished") return "Finished";
  if (shelf === "did_not_finish") return "Did not finish";
  return "Want to read";
}

type CompareColumnProps = {
  label: string;
  side: FriendBookSnapshot | null;
  missingMessage?: string;
  recommended?: PredictedRecommendation | null;
};

function RecommendedScoreBlock({ recommended }: { recommended: PredictedRecommendation }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-foreground">Recommended for you</p>
      <div className="mt-2 flex items-center gap-2">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-card-surface text-sm font-semibold tabular-nums ${scoreColor(
            recommended.predictedSentiment,
          )}`}
        >
          {recommended.score.toFixed(1)}
        </div>
        <p className={`text-xs font-medium ${sentimentTextColor(recommended.predictedSentiment)}`}>
          {sentimentLabel(recommended.predictedSentiment)}
        </p>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-foreground-muted">{recommended.reason}</p>
    </div>
  );
}

function CompareColumn({
  label,
  side,
  missingMessage = "Not in your library",
  recommended,
}: CompareColumnProps) {
  if (!side) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-background/60 px-3 py-3">
        <p className="text-xs font-semibold text-foreground-muted">{label}</p>
        <p className="mt-2 text-sm text-foreground-muted">{missingMessage}</p>
        {recommended ? <RecommendedScoreBlock recommended={recommended} /> : null}
      </div>
    );
  }

  const progress =
    side.shelf === "reading" && side.progressMode != null
      ? readingProgressDisplay(
          side.totalPages ?? 0,
          side.progressMode,
          side.currentPage ?? null,
          side.estimatedRange ?? null,
        )
      : null;

  const showRating = side.shelf === "finished" && side.sentimentBucket != null;

  return (
    <div className="rounded-xl border border-border/80 bg-background px-3 py-3">
      <p className="text-xs font-semibold text-foreground-muted">{label}</p>
      <p className="mt-1 text-[11px] text-foreground-muted">{shelfLabel(side.shelf)}</p>

      {showRating ? (
        <div className="mt-3 flex items-center gap-2">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card-surface text-sm font-semibold tabular-nums ${scoreColor(
              side.sentimentBucket!,
            )}`}
          >
            {side.derivedScore != null ? side.derivedScore.toFixed(1) : "—"}
          </div>
          <p className={`text-xs font-medium ${sentimentTextColor(side.sentimentBucket!)}`}>
            {sentimentLabel(side.sentimentBucket!)}
          </p>
        </div>
      ) : null}

      {side.shelf === "finished" ? (
        <p className="mt-3 text-xs text-foreground-muted">
          <span className="font-semibold text-foreground">Finished</span>
          <br />
          {formatFinishedAt(side.finishedAt)}
        </p>
      ) : null}

      {side.shelf === "reading" && progress ? (
        <p className="mt-3 text-xs leading-snug text-foreground-muted">
          <span className="font-semibold text-foreground">Progress</span>
          <br />
          {progress.line1}
          {progress.line2 ? ` · ${progress.line2}` : ""}
        </p>
      ) : side.shelf === "reading" ? (
        <p className="mt-3 text-xs text-foreground-muted">Progress not set yet</p>
      ) : null}

      {recommended ? <RecommendedScoreBlock recommended={recommended} /> : null}

      <div className="mt-3">
        <p className="text-xs font-semibold text-foreground">Notes</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground-muted">
          {side.notes.trim() ? side.notes : "No notes"}
        </p>
      </div>
    </div>
  );
}

function hasYourRatedFinish(side: FriendBookSnapshot | null): boolean {
  return Boolean(side?.shelf === "finished" && side.sentimentBucket != null);
}

export function FriendBookCompareSheet({
  bookId,
  friendDisplayName,
  friendBook,
  onClose,
}: FriendBookCompareSheetProps) {
  const { state } = useReadingNook();
  const headingId = useId();
  const yourSide = yourBookSnapshot(state, bookId);

  const yourRecommended = useMemo((): PredictedRecommendation | null => {
    if (!friendBook || hasYourRatedFinish(yourSide)) return null;
    const catalogBook = state.catalog[bookId];
    return predictRecommendedScore(state, {
      bookId,
      title: catalogBook?.title ?? friendBook.title,
      author: catalogBook?.author ?? friendBook.author,
      coverUrl: catalogBook?.coverUrl ?? friendBook.coverUrl,
      genres: catalogBook?.genres ?? friendBook.genres,
      readinglogCount: catalogBook?.readinglogCount ?? friendBook.readinglogCount,
    });
  }, [state, bookId, friendBook, yourSide]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  if (!friendBook) {
    return createPortal(
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4">
        <button
          type="button"
          className="absolute inset-0 border-0 bg-transparent p-0"
          aria-label="Dismiss"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative z-10 rounded-2xl border border-border bg-background px-6 py-5 shadow-2xl"
        >
          <p className="text-sm text-foreground-muted">Loading book details…</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 text-sm font-semibold text-accent"
          >
            Close
          </button>
        </div>
      </div>,
      portalTarget,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-transparent p-0"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative z-10 flex max-h-[min(88dvh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="border-b border-border px-4 py-4">
          <div className="flex gap-3">
            <CoverThumb
              src={friendBook.coverUrl}
              alt=""
              sizes="48px"
              fallbackLetter={friendBook.title}
              className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-lg bg-border"
            />
            <div className="min-w-0 flex-1">
              <h2 id={headingId} className="font-serif text-lg font-semibold text-foreground">
                {friendBook.title}
              </h2>
              <p className="mt-0.5 text-sm text-foreground-muted">{friendBook.author}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card-surface text-lg leading-none text-foreground-muted hover:text-foreground"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <CompareColumn label="You" side={yourSide} recommended={yourRecommended} />
            <CompareColumn label={friendDisplayName} side={friendBook} missingMessage="—" />
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
