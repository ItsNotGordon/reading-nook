"use client";

import Image from "next/image";
import { useState } from "react";
import type { Book, UserBook, SentimentBucket } from "@/lib/types";
import { sentimentLabel } from "@/lib/sentiment-display";
import { shelfDisplayName } from "@/lib/shelves";
import { readingProgressDisplayFromBook } from "@/lib/readingProgressDisplay";
import { ProgressBar } from "./ProgressBar";
import { ScoreBadge } from "./ScoreBadge";

export type BookCardVariant = "reading" | "finished" | "want" | "dnf";

type BookCardProps = {
  book: Book;
  userBook: UserBook;
  variant: BookCardVariant;
  onStartPairwise?: (bookId: string, bucket: SentimentBucket) => void;
  onOpenRatedDetail?: (bookId: string) => void;
  onOpenDetail?: (bookId: string) => void;
};

export function BookCard({ book, userBook, variant, onOpenRatedDetail, onOpenDetail }: BookCardProps) {
  const [coverFailed, setCoverFailed] = useState(false);

  const progress = variant === "reading" ? readingProgressDisplayFromBook(book, userBook) : null;

  const handleClick = () => {
    if (onOpenDetail) {
      onOpenDetail(userBook.bookId);
    } else if (variant === "finished" && onOpenRatedDetail) {
      onOpenRatedDetail(userBook.bookId);
    }
  };

  return (
    <article
      className="flex w-[9.75rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm ring-1 ring-black/[0.03] origin-center transition-all duration-200 hover:scale-105 hover:shadow-lg hover:z-10 [[data-dragging]_&]:!transform-none [[data-dragging]_&]:!shadow-sm"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="relative aspect-[2/3] w-full min-h-[1px] bg-border">
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
          <div className="mt-auto space-y-1">
            {progress ? (
              <div className="space-y-1">
                <ProgressBar
                  mode={progress.mode}
                  value={progress.barValue}
                  estimatedBand={progress.estimatedBand}
                  aria-label={progress.line1}
                />
                <p className="text-[10px] leading-snug text-foreground-muted">{progress.line1}</p>
              </div>
            ) : (
              <p className="text-[10px] leading-snug text-foreground-muted">Tap to update progress</p>
            )}
          </div>
        ) : null}

        {variant === "finished" ? (
          <div className="mt-auto flex flex-col gap-1.5">
            {userBook.sentimentBucket && userBook.derivedScore != null ? (
              <>
                <div className="flex items-center gap-1.5">
                  <ScoreBadge score={userBook.derivedScore} bucket={userBook.sentimentBucket} />
                </div>
                <p className="text-[10px] font-medium text-foreground-muted">
                  {sentimentLabel(userBook.sentimentBucket)}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-foreground-muted">Tap to rate</p>
            )}
          </div>
        ) : null}

        {variant === "dnf" ? (
          <p className="mt-auto text-[10px] font-medium text-foreground-muted">
            {shelfDisplayName("did_not_finish")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
