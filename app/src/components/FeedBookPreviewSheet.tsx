"use client";

import { useEffect, useId, useRef } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { useReadingNook } from "@/lib/app-state";
import type { FeedBookInfo } from "./FeedCard";
import type { Shelf } from "@/lib/types";

type FeedBookPreviewSheetProps = {
  book: FeedBookInfo;
  onClose: () => void;
};

const SHELF_OPTIONS: { shelf: Shelf; label: string }[] = [
  { shelf: "want_to_read", label: "Want to Read" },
  { shelf: "reading", label: "Currently Reading" },
  { shelf: "finished", label: "Finished" },
];

export function FeedBookPreviewSheet({ book, onClose }: FeedBookPreviewSheetProps) {
  const { actions } = useReadingNook();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  const addToShelf = (shelf: Shelf) => {
    actions.addBookToShelf(book.bookId, shelf, {
      id: book.bookId,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      genres: [],
      totalPages: 0,
      description: "",
    });
    onClose();
  };

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
        <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="relative">
            <button
              type="button"
              aria-label="Close"
              onClick={() => onClose()}
              className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-surface/80 text-foreground-muted backdrop-blur-sm hover:text-foreground"
            >
              &times;
            </button>
          </div>

          <div className="flex flex-col items-center px-6 pt-6 pb-4">
            <CoverThumb
              src={book.coverUrl}
              alt={`Cover: ${book.title}`}
              sizes="160px"
              fallbackLetter={book.title}
              className="relative h-[220px] w-[148px] shrink-0 overflow-hidden rounded-xl bg-border shadow-lg"
            />

            <h2
              id={headingId}
              className="mt-4 text-center font-serif text-xl font-semibold leading-snug text-foreground"
            >
              {book.title}
            </h2>
            <p className="mt-1 text-center text-sm text-foreground-muted">{book.author}</p>
          </div>

          <div className="px-6 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              Add to library
            </p>
          </div>

          <div className="flex flex-col gap-2 px-6 pb-6">
            {SHELF_OPTIONS.map((opt) => (
              <button
                key={opt.shelf}
                type="button"
                onClick={() => addToShelf(opt.shelf)}
                className="min-h-11 w-full rounded-xl border border-border bg-card-surface px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-accent/40 active:bg-accent-soft/35"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
