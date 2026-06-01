"use client";

import { CoverThumb } from "@/components/CoverThumb";
import { ProgressBar } from "@/components/ProgressBar";
import { readingProgressDisplayFromBook } from "@/lib/readingProgressDisplay";
import { shelfShortLabel } from "@/lib/shelves";
import type { ShelfItem } from "@/lib/shelfItems";
import type { Shelf } from "@/lib/types";

function formatShelfDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function notesPreview(notes: string, max = 72): string | null {
  const t = notes.trim();
  if (!t) return null;
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

type RatingsShelfBookRowProps = {
  item: ShelfItem;
  shelf: Shelf;
  onPress: () => void;
};

export function RatingsShelfBookRow({ item, shelf, onPress }: RatingsShelfBookRowProps) {
  const { book, userBook } = item;
  const progress =
    shelf === "reading" ? readingProgressDisplayFromBook(book, userBook) : null;
  const genres = book.genres.slice(0, 3);
  const preview = notesPreview(userBook.notes ?? "");

  const dateLine =
    shelf === "reading"
      ? userBook.addedAt
        ? `Started ${formatShelfDate(userBook.addedAt)}`
        : null
      : shelf === "did_not_finish"
        ? userBook.addedAt
          ? `Added ${formatShelfDate(userBook.addedAt)}`
          : null
        : userBook.addedAt
          ? `Added ${formatShelfDate(userBook.addedAt)}`
          : null;

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onPress}
        className="flex w-full flex-col gap-2 px-3 py-3 text-left transition-colors hover:bg-accent-soft/25 active:bg-accent-soft/35"
      >
        <div className="flex items-start gap-2.5">
          <CoverThumb
            src={book.coverUrl}
            alt=""
            sizes="36px"
            fallbackLetter={book.title}
            className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-border"
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate text-sm font-semibold text-foreground">{book.title}</p>
            <p className="truncate text-xs text-foreground-muted">{book.author}</p>
            {genres.length > 0 ? (
              <p className="line-clamp-1 text-[10px] text-foreground-muted/90">
                {genres.join(" · ")}
              </p>
            ) : null}
          </div>
          {shelf === "did_not_finish" ? (
            <span className="shrink-0 rounded-full border border-border/80 bg-foreground-muted/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
              {shelfShortLabel("did_not_finish")}
            </span>
          ) : null}
        </div>

        {shelf === "reading" ? (
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
                <p className="text-[10px] leading-snug text-foreground-muted/90">
                  {progress.line2}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="pl-[2.75rem] text-[10px] text-foreground-muted">
              Tap to update progress
            </p>
          )
        ) : null}

        {dateLine ? (
          <p
            className={`text-[10px] text-foreground-muted ${shelf === "reading" && progress ? "" : "pl-[2.75rem]"}`}
          >
            {dateLine}
          </p>
        ) : null}

        {preview ? (
          <p className="line-clamp-2 pl-[2.75rem] text-[11px] leading-snug text-foreground-muted/95">
            {preview}
          </p>
        ) : null}
      </button>
    </li>
  );
}
