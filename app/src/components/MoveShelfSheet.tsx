"use client";

import type { Book, Shelf } from "@/lib/types";
import { moveShelfTargets, shelfDisplayName } from "@/lib/shelves";

type MoveShelfSheetProps = {
  book: Book;
  currentShelf: Shelf;
  onChoose: (shelf: Shelf) => void;
  onClose: () => void;
};

export function MoveShelfSheet({ book, currentShelf, onChoose, onClose }: MoveShelfSheetProps) {
  const targets = moveShelfTargets(currentShelf);
  const clearsRating = currentShelf === "finished";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-transparent p-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-t-2xl border border-border bg-background p-4 shadow-2xl sm:rounded-2xl"
      >
        <p className="font-serif text-lg font-semibold text-foreground">Move to shelf</p>
        <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">{book.title}</p>
        {clearsRating ? (
          <p className="mt-2 text-xs leading-relaxed text-foreground-muted">
            Moving off Finished clears your rating and ranking for this book.
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          {targets.map((shelf) => (
            <button
              key={shelf}
              type="button"
              onClick={() => onChoose(shelf)}
              className="min-h-11 w-full rounded-xl border border-border bg-card-surface px-3 py-2.5 text-left text-sm font-medium text-foreground active:bg-accent-soft/35"
            >
              {shelfDisplayName(shelf)}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
