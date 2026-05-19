"use client";

import Image from "next/image";
import { useState } from "react";
import { useReadingNook } from "@/lib/app-state";
import type { Book, UserBook, SentimentBucket } from "@/lib/types";
import { sentimentLabel, sentimentTextColor } from "@/lib/sentiment-display";
import {
  estimatedQualitativeLabel,
  estimatedRangeMidpoint,
  formatEstimatedPercentRange,
  formatExactProgressLines,
  userBookShowsProgress,
} from "@/lib/progress";
import { ProgressBar } from "./ProgressBar";
import { ScoreBadge } from "./ScoreBadge";
import { FinishBookSheet } from "./FinishBookSheet";
import { ProgressUpdateSheet } from "./ProgressUpdateSheet";

export type BookCardVariant = "reading" | "finished" | "want";

type BookCardProps = {
  book: Book;
  userBook: UserBook;
  variant: BookCardVariant;
  onStartPairwise?: (bookId: string, bucket: SentimentBucket) => void;
};

type ReadingProgressVm = {
  mode: "exact" | "estimated";
  barValue: number;
  estimatedBand?: [number, number];
  line1: string;
  line2: string | null;
};

function readingProgressView(book: Book, userBook: UserBook): ReadingProgressVm | null {
  if (!userBookShowsProgress(userBook)) return null;

  if (userBook.progressMode === "exact") {
    if (book.totalPages <= 0 || userBook.currentPage === null) return null;
    const total = Math.max(1, book.totalPages);
    const page = Math.min(total, Math.max(0, Math.floor(userBook.currentPage)));
    const { pagesLine, pctLine } = formatExactProgressLines(page, book.totalPages);
    return {
      mode: "exact",
      barValue: page / total,
      line1: pagesLine,
      line2: pctLine,
    };
  }

  if (!userBook.estimatedRange) return null;
  const [lo, hi] = userBook.estimatedRange;
  const mid = estimatedRangeMidpoint([lo, hi]);
  return {
    mode: "estimated",
    barValue: mid,
    estimatedBand: [lo, hi],
    line1: formatEstimatedPercentRange([lo, hi]),
    line2: estimatedQualitativeLabel([lo, hi]),
  };
}

export function BookCard({ book, userBook, variant, onStartPairwise }: BookCardProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const { actions } = useReadingNook();
  const [progressOpen, setProgressOpen] = useState(false);
  const [wantOpen, setWantOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);

  const progress = variant === "reading" ? readingProgressView(book, userBook) : null;

  return (
    <>
      <article
        className="flex w-[9.75rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm ring-1 ring-black/[0.03]"
        role={variant === "want" || variant === "finished" ? "button" : undefined}
        tabIndex={variant === "want" || variant === "finished" ? 0 : undefined}
        onClick={
          variant === "want"
            ? () => setWantOpen(true)
            : variant === "finished"
              ? () => setFinishOpen(true)
              : undefined
        }
        onKeyDown={
          variant === "want" || variant === "finished"
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (variant === "want") setWantOpen(true);
                  else setFinishOpen(true);
                }
              }
            : undefined
        }
      >
        <div className="relative aspect-[2/3] w-full bg-border">
          {!coverFailed ? (
            <Image
              src={book.coverUrl}
              alt={`Cover: ${book.title}`}
              fill
              sizes="156px"
              className="object-cover"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-accent-soft/40 px-2 text-center"
              aria-hidden
            >
              <span className="font-serif text-lg font-semibold leading-tight text-foreground/80">
                {book.title.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-2.5">
          <div className="min-h-0 space-y-0.5">
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug tracking-tight text-foreground">
              {book.title}
            </h3>
            <p className="line-clamp-1 text-[11px] text-foreground-muted">{book.author}</p>
          </div>

          {variant === "reading" ? (
            <div className="mt-auto space-y-2">
              {progress ? (
                <div className="space-y-1">
                  <ProgressBar
                    mode={progress.mode}
                    value={progress.barValue}
                    estimatedBand={progress.estimatedBand}
                    aria-label={progress.line1}
                  />
                  <p className="text-[10px] leading-snug text-foreground-muted">{progress.line1}</p>
                  {progress.line2 ? (
                    <p className="text-[10px] font-medium leading-snug text-foreground-muted">
                      {progress.line2}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-[10px] leading-snug text-foreground-muted">Set progress to stay on pace.</p>
              )}
              <button
                type="button"
                onClick={() => setProgressOpen(true)}
                className="w-full rounded-lg border border-border bg-background py-2 text-[11px] font-semibold text-foreground shadow-sm transition-colors active:bg-accent-soft/35"
              >
                Update progress
              </button>
              <button
                type="button"
                onClick={() => setFinishOpen(true)}
                className="w-full rounded-lg border border-border bg-accent py-2 text-[11px] font-semibold text-white shadow-sm transition-colors hover:opacity-95"
              >
                Mark finished
              </button>
            </div>
          ) : null}

          {variant === "finished" ? (
            <div className="mt-auto flex flex-col gap-1.5">
              {userBook.sentimentBucket && userBook.derivedScore != null ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <ScoreBadge
                      score={userBook.derivedScore}
                      scoreClassName={sentimentTextColor(userBook.sentimentBucket)}
                    />
                  </div>
                  <p className="text-[10px] font-medium text-foreground-muted">
                    {sentimentLabel(userBook.sentimentBucket)}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-foreground-muted">No sentiment yet</p>
              )}
              {userBook.finishedAt ? (
                <p className="text-[10px] text-foreground-muted">
                  Finished on{" "}
                  {new Date(userBook.finishedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      {variant === "reading" && progressOpen ? (
        <ProgressUpdateSheet
          bookId={userBook.bookId}
          book={book}
          userBook={userBook}
          actions={actions}
          onClose={() => setProgressOpen(false)}
        />
      ) : null}

      {finishOpen ? (
        <FinishBookSheet
          bookId={userBook.bookId}
          book={book}
          userBook={userBook}
          actions={actions}
          onStartPairwise={(b) => {
            onStartPairwise?.(userBook.bookId, b);
          }}
          onClose={() => setFinishOpen(false)}
        />
      ) : null}

      {variant === "want" && wantOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 p-4">
          <button
            type="button"
            className="absolute inset-0 border-0 bg-transparent p-0"
            aria-label="Close move shelf dialog"
            onClick={() => setWantOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`move-want-title-${userBook.bookId}`}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-background p-4 shadow-2xl"
          >
            <p
              id={`move-want-title-${userBook.bookId}`}
              className="font-serif text-lg font-semibold text-foreground"
            >
              Move book
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">{book.title}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  actions.moveBookToShelf(userBook.bookId, "reading");
                  setWantOpen(false);
                }}
                className="w-full rounded-xl border border-border bg-card-surface px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-accent/40"
              >
                Move to Currently Reading
              </button>
              <button
                type="button"
                onClick={() => {
                  setWantOpen(false);
                  setFinishOpen(true);
                }}
                className="w-full rounded-xl border border-border bg-card-surface px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-accent/40"
              >
                Move to Finished
              </button>
              <button
                type="button"
                onClick={() => setWantOpen(false)}
                className="mt-1 rounded-xl border border-border bg-background py-2 text-sm font-medium text-foreground-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
