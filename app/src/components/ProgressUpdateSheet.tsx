"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ReadingNookActions } from "@/lib/app-state";
import type { Book, BookId, UserBook } from "@/lib/types";
import {
  ESTIMATED_PROGRESS_RANGES,
  formatEstimatedPercentRange,
  matchesCanonicalRange,
} from "@/lib/progress";

function fractionRangePctLabel(lo: number, hi: number): string {
  return `${Math.round(lo * 100)}–${Math.round(hi * 100)}%`;
}

type ProgressUpdateSheetProps = {
  bookId: BookId;
  book: Book;
  userBook: UserBook;
  actions: ReadingNookActions;
  onClose: () => void;
};

export function ProgressUpdateSheet({
  bookId,
  book,
  userBook,
  actions,
  onClose,
}: ProgressUpdateSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const canExact = book.totalPages > 0;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  const normalizedRange =
    userBook.estimatedRange && matchesCanonicalRange(userBook.estimatedRange)
      ? userBook.estimatedRange
      : ([0, 0.25] as [number, number]);

  const [draftPage, setDraftPage] = useState(
    String(userBook.currentPage ?? (canExact ? 1 : 0)),
  );
  const [mode, setMode] = useState<"exact" | "estimated">(
    userBook.progressMode === "exact" && canExact ? "exact" : "estimated",
  );
  const [draftRange, setDraftRange] = useState<[number, number]>(normalizedRange);

  function save(): void {
    if (mode === "exact" && canExact) {
      const raw = draftPage.trim() === "" ? 0 : Number(draftPage);
      const tp = Math.floor(book.totalPages);
      const clamped =
        Number.isFinite(raw)
          ? Math.min(tp, Math.max(0, Math.floor(raw)))
          : 1;
      actions.updateExactProgress(bookId, clamped);
    } else {
      const canon = matchesCanonicalRange(draftRange);
      if (canon) actions.updateEstimatedProgress(bookId, canon);
    }
    onClose();
  }

  const exactDisabledReason = mode === "exact" && !canExact;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[100] m-0 max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/35 [&::backdrop]:bg-black/35"
      aria-labelledby={headingId}
      onClose={() => onClose()}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="absolute inset-0 cursor-default border-0 bg-black/35 p-0"
          aria-label="Dismiss"
          tabIndex={-1}
          onClick={() => onClose()}
        />
        <div className="relative z-10 flex max-h-[min(88dvh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="mx-auto mt-2 hidden h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
        <div className="min-h-0 max-h-[min(80dvh,520px)] overflow-y-auto">
          <div className="border-b border-border px-4 pb-4 pt-3">
            <div className="flex gap-3">
              <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-border">
                <Image
                  src={book.coverUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div className="min-w-0">
                <p id={headingId} className="font-serif text-lg font-semibold text-foreground">
                  Update progress
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-foreground-muted">{book.title}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                How would you like to track?
              </legend>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!canExact}
                  onClick={() => setMode("exact")}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    mode === "exact" && canExact
                      ? "bg-accent text-white shadow-[0_6px_16px_-4px_rgba(66,100,71,0.35)]"
                      : "border border-border bg-card-surface text-foreground-muted disabled:cursor-not-allowed disabled:opacity-50"
                  }`}
                >
                  Exact (pages)
                </button>
                <button
                  type="button"
                  onClick={() => setMode("estimated")}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    mode === "estimated"
                      ? "bg-progress-estimated text-[#362e12] shadow-sm"
                      : "border border-border bg-card-surface text-foreground-muted"
                  }`}
                >
                  Estimated
                </button>
              </div>
              {!canExact ? (
                <p className="text-xs leading-relaxed text-foreground-muted">
                  Page count isn&apos;t listed for this edition. Use estimated ranges, or skip until you have a total page count.
                </p>
              ) : null}
            </fieldset>

            {mode === "exact" && canExact ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Current page</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={book.totalPages}
                  value={draftPage}
                  onChange={(e) => setDraftPage(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card-surface px-3.5 py-2.5 text-sm tabular-nums text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
                />
                <p className="text-xs text-foreground-muted">
                  Out of {book.totalPages} pages (edition approximate).
                </p>
              </label>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Roughly where are you?</p>
                <ul className="space-y-2">
                  {ESTIMATED_PROGRESS_RANGES.map(([lo, hi]) => {
                    const active = draftRange[0] === lo && draftRange[1] === hi;
                    return (
                      <li key={`${lo}-${hi}`}>
                        <button
                          type="button"
                          onClick={() => setDraftRange([lo, hi])}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                            active
                              ? "border-progress-estimated bg-progress-estimated-track shadow-inner"
                              : "border-border bg-card-surface hover:border-accent/40"
                          }`}
                        >
                          <span className="font-medium text-foreground">
                            {fractionRangePctLabel(lo, hi)}
                          </span>
                          <span className="text-xs text-foreground-muted">
                            {formatEstimatedPercentRange([lo, hi])}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Wrong shelf?
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                If this book shouldn&apos;t be on Currently Reading, you can shelve it as finished or take it off your library.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  className="w-full rounded-xl border border-border bg-card-surface px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-accent/50 hover:bg-background"
                  onClick={() => {
                    actions.moveBookToShelf(bookId, "finished");
                    onClose();
                  }}
                >
                  Move to Finished (pick sentiment from the book card)
                </button>
                <button
                  type="button"
                  className="w-full rounded-xl border border-red-200 bg-card-surface px-3 py-2.5 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      !window.confirm(`Remove "${book.title}" from your library?`)
                    ) {
                      return;
                    }
                    actions.removeUserBook(bookId);
                    onClose();
                  }}
                >
                  Remove from library
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
              }}
              className="rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-card-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={exactDisabledReason}
              className="rounded-xl border border-border bg-accent py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
        </div>
      </div>
    </dialog>
  );
}
