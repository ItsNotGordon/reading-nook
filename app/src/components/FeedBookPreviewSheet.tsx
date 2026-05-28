"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { useReadingNook } from "@/lib/app-state";
import { enrichBook } from "@/lib/enrichOpenLibraryBook";
import type { Book } from "@/lib/types";
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

const EMPTY_BOOK_META: Pick<Book, "genres" | "description"> = {
  genres: [],
  description: "",
};

function shelfIcon(shelf: Shelf) {
  if (shelf === "want_to_read") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 4.5h12a1 1 0 0 1 1 1V20l-7-3-7 3V5.5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (shelf === "reading") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3.5 6.5c2.8-1.5 6.2-1.6 8.5-.2v12.3c-2.3-1.4-5.7-1.3-8.5.2V6.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M20.5 6.5c-2.8-1.5-6.2-1.6-8.5-.2v12.3c2.3-1.4 5.7-1.3 8.5.2V6.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4.5" y="4.5" width="12" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 8h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="m17 15.5 2.2 2.2L22 14.9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FeedBookPreviewSheet({ book, onClose }: FeedBookPreviewSheetProps) {
  const { actions, state } = useReadingNook();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [bookMeta, setBookMeta] = useState<Pick<Book, "genres" | "description">>(EMPTY_BOOK_META);

  const baseBook = useMemo<Book>(() => {
    const fromCatalog = state.catalog[book.bookId];
    if (fromCatalog) return fromCatalog;
    return {
      id: book.bookId,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      totalPages: 0,
      genres: [],
      description: "",
    };
  }, [state.catalog, book.bookId, book.title, book.author, book.coverUrl]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  useEffect(() => {
    let active = true;
    setBookMeta({
      genres: baseBook.genres ?? [],
      description: baseBook.description ?? "",
    });
    void enrichBook(baseBook).then((enriched) => {
      if (!active) return;
      setBookMeta({
        genres: enriched.genres ?? [],
        description: enriched.description ?? "",
      });
    });
    return () => {
      active = false;
    };
  }, [baseBook]);

  const addToShelf = (shelf: Shelf) => {
    actions.addBookToShelf(book.bookId, shelf, {
      id: book.bookId,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      genres: bookMeta.genres,
      totalPages: 0,
      description: bookMeta.description,
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

          <div className="px-6 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Add to library</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SHELF_OPTIONS.map((opt) => (
                <button
                  key={opt.shelf}
                  type="button"
                  onClick={() => addToShelf(opt.shelf)}
                  className="inline-flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card-surface px-2 py-2 text-center text-[11px] font-medium text-foreground transition-colors hover:border-accent/40 active:bg-accent-soft/35"
                >
                  <span className="text-accent">{shelfIcon(opt.shelf)}</span>
                  <span className="leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Genres</p>
            {bookMeta.genres.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {bookMeta.genres.slice(0, 6).map((g) => (
                  <li
                    key={g}
                    className="rounded-full border border-border/80 bg-card-surface px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {g}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-foreground-muted">No genres listed.</p>
            )}
          </div>

          <div className="px-6 pb-6 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Description</p>
            {bookMeta.description.trim() ? (
              <div className="mt-2 rounded-xl border border-dashed border-border/80 bg-card-surface/60 px-3 py-3 shadow-inner">
                <p className="max-h-28 overflow-y-auto text-sm leading-relaxed text-foreground">
                  {bookMeta.description}
                </p>
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-border/80 bg-card-surface/60 px-3 py-3 shadow-inner">
                <p className="text-sm italic text-foreground-muted">No description available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
