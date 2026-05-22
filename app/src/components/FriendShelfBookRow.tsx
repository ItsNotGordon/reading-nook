"use client";

import { CoverThumb } from "@/components/CoverThumb";
import { ProgressBar } from "@/components/ProgressBar";
import { readingProgressDisplay } from "@/lib/readingProgressDisplay";
import type { FriendShelfBook } from "@/lib/friendLibrary";

type FriendShelfBookRowProps = {
  book: FriendShelfBook;
  onPress?: () => void;
  /** Friend profile Currently Reading: compact row, bar under author only (no % / label text). */
  compactReading?: boolean;
};

const buttonClass =
  "flex w-full rounded-xl border border-border/80 bg-background text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/20 active:bg-accent-soft/40";

export function FriendShelfBookRow({ book, onPress, compactReading }: FriendShelfBookRowProps) {
  const progress =
    book.shelf === "reading" && book.progressMode != null
      ? readingProgressDisplay(
          book.totalPages ?? 0,
          book.progressMode,
          book.currentPage ?? null,
          book.estimatedRange ?? null,
        )
      : null;

  const isCompactReading = Boolean(compactReading && book.shelf === "reading");

  const inner = isCompactReading ? (
    <div className="flex items-start gap-2.5">
      <CoverThumb
        src={book.coverUrl}
        alt=""
        sizes="32px"
        fallbackLetter={book.title}
        className="relative h-10 w-8 shrink-0 overflow-hidden rounded-md bg-border"
      />
      <div className="flex min-w-0 flex-1 items-stretch gap-2.5">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-medium leading-snug text-foreground">{book.title}</p>
          <p className="truncate text-[11px] leading-snug text-foreground-muted">{book.author}</p>
        </div>
        <div className="flex w-[38%] min-w-[5.5rem] max-w-[9.5rem] shrink-0 flex-col justify-center">
          {progress ? (
            <ProgressBar
              mode={progress.mode}
              value={progress.barValue}
              estimatedBand={progress.estimatedBand}
              aria-label={progress.line1}
            />
          ) : (
            <p className="text-[10px] leading-snug text-foreground-muted">Progress not set yet</p>
          )}
        </div>
      </div>
    </div>
  ) : (
    <>
      <div className="flex items-center gap-3">
        <CoverThumb
          src={book.coverUrl}
          alt=""
          sizes="40px"
          fallbackLetter={book.title}
          className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-border"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{book.title}</p>
          <p className="truncate text-xs text-foreground-muted">{book.author}</p>
        </div>
      </div>
      {book.shelf === "reading" ? (
        progress ? (
          <div className="space-y-1 pl-[2.75rem]">
            <ProgressBar
              mode={progress.mode}
              value={progress.barValue}
              estimatedBand={progress.estimatedBand}
              aria-label={progress.line1}
            />
            <p className="text-[10px] leading-snug text-foreground-muted">{progress.line1}</p>
            {progress.line2 ? (
              <p className="text-[10px] leading-snug text-foreground-muted/90">{progress.line2}</p>
            ) : null}
          </div>
        ) : (
          <p className="pl-[2.75rem] text-[10px] text-foreground-muted">Progress not set yet</p>
        )
      ) : null}
    </>
  );

  const paddingClass = isCompactReading ? "py-2 px-2.5" : "flex flex-col gap-2 py-2.5 px-3";

  if (onPress) {
    return (
      <li>
        <button type="button" onClick={onPress} className={`${buttonClass} ${paddingClass}`}>
          {inner}
        </button>
      </li>
    );
  }

  return (
    <li className={`rounded-xl border border-border/80 bg-background ${paddingClass}`}>
      {inner}
    </li>
  );
}
