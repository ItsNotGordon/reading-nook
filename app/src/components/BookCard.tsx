"use client";

import Image from "next/image";
import { useState } from "react";
import { useReadingNook } from "@/lib/app-state";
import type { Book, UserBook, SentimentBucket } from "@/lib/types";
import { SENTIMENT_BUCKETS } from "@/lib/types";
import { sentimentLabel, sentimentTextColor } from "@/lib/sentiment-display";
import { readingProgressDisplayFromBook } from "@/lib/readingProgressDisplay";
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
  onOpenRatedDetail?: (bookId: string) => void;
};

export function BookCard({ book, userBook, variant, onStartPairwise, onOpenRatedDetail }: BookCardProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const { state, actions } = useReadingNook();
  const [progressOpen, setProgressOpen] = useState(false);
  const [wantOpen, setWantOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);

  const progress = variant === "reading" ? readingProgressDisplayFromBook(book, userBook) : null;

  const isRatedFinished =
    variant === "finished" &&
    (userBook.sentimentBucket != null ||
      SENTIMENT_BUCKETS.some((b) => state.bucketRankings[b]?.includes(userBook.bookId)));

  const openFinished = () => {
    if (isRatedFinished) onOpenRatedDetail?.(userBook.bookId);
    else setFinishOpen(true);
  };

  return (
    <>
      <article
        className="flex w-[9.75rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm ring-1 ring-black/[0.03] origin-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:z-10 [[data-dragging]_&]:!transform-none [[data-dragging]_&]:!shadow-sm"
        role={variant === "want" || variant === "finished" ? "button" : undefined}
        tabIndex={variant === "want" || variant === "finished" ? 0 : undefined}
        onClick={
          variant === "want"
            ? () => setWantOpen(true)
            : variant === "finished"
              ? openFinished
              : undefined
        }
        onKeyDown={
          variant === "want" || variant === "finished"
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (variant === "want") setWantOpen(true);
                  else openFinished();
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
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Date added
              </p>
              <input
                type="date"
                value={userBook.addedAt ? new Date(userBook.addedAt).toISOString().slice(0, 10) : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  actions.updateAddedAt(userBook.bookId, new Date(val + "T12:00:00").toISOString());
                }}
                className="mt-1 w-full rounded-lg border border-border bg-card-surface px-3 py-2 text-sm text-foreground"
              />
            </div>
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
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    !window.confirm(`Remove "${book.title}" from your library?`)
                  ) {
                    return;
                  }
                  actions.removeUserBook(userBook.bookId);
                  setWantOpen(false);
                }}
                className="w-full rounded-xl border border-red-200 bg-card-surface px-3 py-2.5 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
              >
                Remove from library
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
