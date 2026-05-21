"use client";

import { CoverThumb } from "@/components/CoverThumb";
import { ProgressBar } from "@/components/ProgressBar";
import { readingProgressDisplay } from "@/lib/readingProgressDisplay";
import type { FriendShelfBook } from "@/lib/friendLibrary";

type FriendShelfBookRowProps = {
  book: FriendShelfBook;
};

export function FriendShelfBookRow({ book }: FriendShelfBookRowProps) {
  const progress =
    book.shelf === "reading" && book.progressMode != null
      ? readingProgressDisplay(
          book.totalPages ?? 0,
          book.progressMode,
          book.currentPage ?? null,
          book.estimatedRange ?? null,
        )
      : null;

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border/80 bg-background px-3 py-2.5">
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
    </li>
  );
}
