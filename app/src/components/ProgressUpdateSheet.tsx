"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ReadingNookActions } from "@/lib/app-state";
import type { Book, BookId, UserBook } from "@/lib/types";
import {
  ESTIMATED_PROGRESS_RANGES,
  estimatedQualitativeLabel,
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

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  const normalizedRange =
    userBook.estimatedRange && matchesCanonicalRange(userBook.estimatedRange)
      ? userBook.estimatedRange
      : ([0, 0.25] as [number, number]);

  const initialTotal =
    book.totalPages > 0 ? String(book.totalPages) : "";
  const initialPage =
    userBook.currentPage != null
      ? String(userBook.currentPage)
      : book.totalPages > 0
        ? "1"
        : "";

  const [draftTotalPages, setDraftTotalPages] = useState(initialTotal);
  const [draftPage, setDraftPage] = useState(initialPage);
  const [mode, setMode] = useState<"exact" | "estimated">(
    userBook.progressMode === "exact" ? "exact" : "estimated",
  );
  const [draftRange, setDraftRange] = useState<[number, number]>(normalizedRange);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  function save(): void {
    setSaveHint(null);
    if (mode === "exact") {
      const totalRaw = draftTotalPages.trim() === "" ? NaN : Number(draftTotalPages);
      const pageRaw = draftPage.trim() === "" ? 0 : Number(draftPage);
      if (!Number.isFinite(totalRaw) || totalRaw < 1) {
        setSaveHint("Enter total pages (at least 1) for this edition.");
        return;
      }
      const total = Math.floor(totalRaw);
      const current = Number.isFinite(pageRaw) ? Math.floor(pageRaw) : 0;
      actions.updateReadingExactProgress(bookId, total, current);
    } else {
      const canon = matchesCanonicalRange(draftRange);
      if (canon) actions.updateEstimatedProgress(bookId, canon);
    }
    onClose();
  }

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
          <div className="min-h-0 flex-1 overflow-y-auto">
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

            <div className="space-y-3 px-4 py-4">
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  How would you like to track?
                </legend>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode("exact")}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      mode === "exact"
                        ? "bg-accent text-white shadow-[0_6px_16px_-4px_rgba(66,100,71,0.35)]"
                        : "border border-border bg-card-surface text-foreground-muted"
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
              </fieldset>

              {mode === "exact" ? (
                <div className="space-y-2">
                  <p className="text-xs leading-relaxed text-foreground-muted">
                    Enter your edition&apos;s page count if we don&apos;t have it yet. You can
                    update both numbers anytime.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-foreground">Current page</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={draftPage}
                        onChange={(e) => setDraftPage(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-xl border border-border bg-card-surface px-3 py-2.5 text-sm tabular-nums text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-foreground">Total pages</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={draftTotalPages}
                        onChange={(e) => setDraftTotalPages(e.target.value)}
                        placeholder="e.g. 320"
                        className="w-full rounded-xl border border-border bg-card-surface px-3 py-2.5 text-sm tabular-nums text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Roughly where are you?</p>
                  <ul className="grid grid-cols-2 gap-2">
                    {ESTIMATED_PROGRESS_RANGES.map(([lo, hi]) => {
                      const active = draftRange[0] === lo && draftRange[1] === hi;
                      return (
                        <li key={`${lo}-${hi}`}>
                          <button
                            type="button"
                            onClick={() => setDraftRange([lo, hi])}
                            className={`flex w-full flex-col items-start gap-0.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                              active
                                ? "border-progress-estimated bg-progress-estimated-track shadow-inner"
                                : "border-border bg-card-surface hover:border-accent/40"
                            }`}
                          >
                            <span className="text-sm font-medium leading-tight text-foreground">
                              {fractionRangePctLabel(lo, hi)}
                            </span>
                            <span className="text-[10px] leading-tight text-foreground-muted">
                              {estimatedQualitativeLabel([lo, hi])}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {saveHint ? <p className="text-xs text-red-700">{saveHint}</p> : null}

              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Date added
                  </p>
                </div>
                <input
                  type="date"
                  value={userBook.addedAt ? new Date(userBook.addedAt).toISOString().slice(0, 10) : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    actions.updateAddedAt(bookId, new Date(val + "T12:00:00").toISOString());
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-card-surface px-3 py-2 text-sm text-foreground"
                />
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Wrong shelf?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                  If this book shouldn&apos;t be on Currently Reading, you can shelve it as finished
                  or take it off your library.
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    className="w-full rounded-xl border border-border bg-card-surface px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:border-accent/50 hover:bg-background"
                    onClick={() => {
                      actions.moveBookToShelf(bookId, "finished");
                      onClose();
                    }}
                  >
                    Move to Finished (pick sentiment from the book card)
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-red-200 bg-card-surface px-3 py-2 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
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
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-card-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-xl border border-border bg-accent py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-95"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
