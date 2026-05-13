"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ReadingNookActions } from "@/lib/app-state";
import type { Book, BookId, SentimentBucket, UserBook } from "@/lib/types";
import { useReadingNook } from "@/lib/app-state";

type FinishBookSheetProps = {
  bookId: BookId;
  book: Book;
  userBook: UserBook;
  actions: ReadingNookActions;
  onStartPairwise?: (bucket: SentimentBucket) => void;
  onClose: () => void;
};

const OPTIONS: Array<{ bucket: SentimentBucket; title: string }> = [
  { bucket: "liked", title: "Liked it" },
  { bucket: "okay", title: "It was okay" },
  { bucket: "disliked", title: "Didn't like it" },
];

export function FinishBookSheet({
  bookId,
  book,
  userBook,
  actions,
  onStartPairwise,
  onClose,
}: FinishBookSheetProps) {
  const { state } = useReadingNook();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  function isoToDateInputValue(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    // sv-SE gives YYYY-MM-DD in local time without timezone shifting
    return d.toLocaleDateString("sv-SE");
  }
  function dateInputValueToIso(dateOnly: string): string {
    // Parse as local date and anchor at noon so timezone conversions don't shift the calendar day.
    const d = new Date(`${dateOnly}T12:00:00`);
    return d.toISOString();
  }
  const initialDate = (() => {
    if (userBook.finishedAt) {
      return isoToDateInputValue(userBook.finishedAt);
    }
    const today = new Date();
    return today.toISOString().slice(0, 10);
  })();
  const [dateValue, setDateValue] = useState<string>(initialDate);

  function updateFinishedDateAndClose(): void {
    const chosen = dateValue && dateValue.trim() !== "" ? dateValue : initialDate;
    const iso = dateInputValueToIso(chosen);
    actions.updateFinishedAt(bookId, iso);
    onClose();
  }

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  function choose(bucket: SentimentBucket) {
    const chosen = dateValue && dateValue.trim() !== "" ? dateValue : initialDate;
    const iso = dateInputValueToIso(chosen);
    if (userBook.shelf !== "finished") {
      actions.moveBookToShelf(bookId, "finished");
    }
    actions.updateFinishedAt(bookId, iso);

    // If the user just re-selects the same bucket, only update the finish date.
    if (userBook.shelf === "finished" && userBook.sentimentBucket === bucket) {
      onClose();
      return;
    }

    const existingIds = (state.bucketRankings[bucket] ?? []).filter((id) => id !== bookId);
    if (existingIds.length === 0) {
      actions.insertBookIntoBucketAtIndex(bookId, bucket, 0);
      onClose();
      return;
    }

    // Transition into pairwise insertion UI.
    onStartPairwise?.(bucket);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[110] m-0 max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/35 [&::backdrop]:bg-black/35"
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
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="border-b border-border px-4 pb-3 pt-3">
            <div className="flex items-start gap-3">
              <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-border">
                <Image src={book.coverUrl} alt="" fill className="object-cover" sizes="40px" />
              </div>
              <div className="min-w-0 flex-1">
                <p id={headingId} className="font-serif text-lg font-semibold text-foreground">
                  How did you feel about this book?
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">{book.title}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => onClose()}
                className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-surface text-foreground-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                How was it?
              </p>
              <div className="flex items-center justify-between gap-4">
                {OPTIONS.map((o) => {
                  const active = userBook.sentimentBucket === o.bucket;
                  const baseClass =
                    o.bucket === "liked"
                      ? "bg-[#cde9cf]"
                      : o.bucket === "okay"
                        ? "bg-[#f5e8b8]"
                        : "bg-[#f6c7c3]";
                  const activeFillClass =
                    o.bucket === "liked"
                      ? "bg-[#426447]"
                      : o.bucket === "okay"
                        ? "bg-[#e0b93c]"
                        : "bg-[#d46457]";
                  return (
                    <button
                      key={o.bucket}
                      type="button"
                      onClick={() => choose(o.bucket)}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <span
                        className={`h-12 w-12 rounded-full border border-border transition-colors ${
                          active ? activeFillClass : baseClass
                        }`}
                      />
                      <span className="text-[11px] text-foreground-muted">{o.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Finished on
              </p>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full rounded-xl border border-border bg-card-surface px-3 py-2 text-sm text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
              />
            </div>

            <div className="border-t border-dashed border-border/70 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Extras
              </p>
              <button
                type="button"
                className="mt-2 inline-flex w-full items-center justify-between rounded-xl border border-border bg-card-surface px-3 py-2.5 text-left text-sm font-medium text-foreground-muted transition-colors hover:border-accent/40 hover:text-foreground"
              >
                <span>Add notes</span>
                <span className="text-xs text-foreground-muted">Coming soon</span>
              </button>
            </div>
          </div>

          <div className="border-t border-border px-4 py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-card-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateFinishedDateAndClose()}
                className="rounded-xl border border-border bg-accent py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-95"
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

