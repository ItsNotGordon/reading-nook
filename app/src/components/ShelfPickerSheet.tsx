"use client";

import { useEffect, useState } from "react";
import { GenreChipPicker } from "@/components/GenreChipPicker";
import type { Book, Shelf } from "@/lib/types";

export const SHELF_CHOICES: { shelf: Shelf; title: string; subtitle: string }[] = [
  {
    shelf: "reading",
    title: "Currently Reading",
    subtitle: "On your nightstand",
  },
  {
    shelf: "finished",
    title: "Finished",
    subtitle: "Done for now",
  },
  {
    shelf: "want_to_read",
    title: "Want to Read",
    subtitle: "Save for later",
  },
];

export function shelfDisplayName(shelf: Shelf): string {
  const row = SHELF_CHOICES.find((s) => s.shelf === shelf);
  return row?.title ?? shelf;
}

type ShelfPickerSheetProps = {
  book: Book | null;
  onClose: () => void;
  onChooseShelf: (shelf: Shelf, genres: string[]) => void;
};

export function ShelfPickerSheet({ book, onClose, onChooseShelf }: ShelfPickerSheetProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    if (!book) return;
    queueMicrotask(() => setSelectedGenres([...(book.genres ?? [])]));
  }, [book]);

  useEffect(() => {
    if (!book) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [book, onClose]);

  if (!book) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/45 p-0 sm:p-4 sm:pb-8">
      <button
        type="button"
        className="min-h-[30%] flex-1 cursor-default sm:min-h-0"
        aria-label="Close shelf picker"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shelf-picker-title"
        className="max-h-[min(90vh,640px)] w-full overflow-y-auto rounded-t-2xl border border-border bg-background shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden />
        <div className="border-b border-border px-4 pb-3 pt-3 sm:pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p id="shelf-picker-title" className="font-serif text-lg font-semibold text-foreground">
                Add to shelf
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">{book.title}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card-surface text-lg leading-none text-foreground-muted active:bg-accent-soft/35"
            >
              ×
            </button>
          </div>
        </div>
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Genres (optional)
          </p>
          <p className="mt-0.5 text-xs text-foreground-muted">Tap to select genres for this book.</p>
          <div className="mt-2">
            <GenreChipPicker
              value={selectedGenres}
              onChange={setSelectedGenres}
              searchable
              variant="shelfPicker"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {SHELF_CHOICES.map(({ shelf, title, subtitle }) => (
            <button
              key={shelf}
              type="button"
              onClick={() => onChooseShelf(shelf, selectedGenres)}
              className="flex min-h-[48px] w-full flex-col justify-center rounded-xl border border-border bg-card-surface px-3 py-3 text-left transition-colors active:bg-accent-soft/35"
            >
              <span className="text-sm font-semibold text-foreground">{title}</span>
              <span className="text-xs text-foreground-muted">{subtitle}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="mt-1 min-h-11 rounded-xl py-2.5 text-center text-sm font-medium text-foreground-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
