"use client";

import { useEffect, useMemo, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { GenreChipPicker } from "@/components/GenreChipPicker";
import type { Book, Shelf } from "@/lib/types";

const SHELF_OPTIONS: Array<{ shelf: Shelf; label: string }> = [
  { shelf: "want_to_read", label: "Want to Read" },
  { shelf: "reading", label: "Currently Reading" },
  { shelf: "finished", label: "Finished" },
];

function shelfIcon(shelf: Shelf) {
  if (shelf === "want_to_read") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3.5 6.5c2.8-1.5 6.2-1.6 8.5-.2v12.3c-2.3-1.4-5.7-1.3-8.5.2V6.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        <path d="M20.5 6.5c-2.8-1.5-6.2-1.6-8.5-.2v12.3c2.3-1.4 5.7-1.3 8.5.2V6.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4.5" y="4.5" width="12" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 8h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="m17 15.5 2.2 2.2L22 14.9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type AddToShelfSheetProps = {
  open: boolean;
  book: Book | null;
  onClose: () => void;
  onChooseShelf: (shelf: Shelf, genres: string[], visibility: "public" | "private") => void;
  initialVisibility?: "public" | "private";
  initialShelf?: Shelf | null;
};

export function AddToShelfSheet({
  open,
  book,
  onClose,
  onChooseShelf,
  initialVisibility = "public",
  initialShelf = null,
}: AddToShelfSheetProps) {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(() => [...(book?.genres ?? [])]);
  const [makePrivate, setMakePrivate] = useState(initialVisibility === "private");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [editingGenres, setEditingGenres] = useState(false);
  const [activeShelf, setActiveShelf] = useState<Shelf | null>(initialShelf);
  const [didEditGenres, setDidEditGenres] = useState(false);

  useEffect(() => {
    if (!open || !book) return;
    queueMicrotask(() => {
      setSelectedGenres([...(book.genres ?? [])]);
      setMakePrivate(initialVisibility === "private");
      setShowFullDescription(false);
      setEditingGenres(false);
      setActiveShelf(initialShelf);
      setDidEditGenres(false);
    });
  }, [open, book?.id, initialVisibility, initialShelf]);

  useEffect(() => {
    if (!open || !book) return;
    if (didEditGenres) return;
    const incoming = book.genres ?? [];
    if (incoming.length === 0 || selectedGenres.length > 0) return;
    queueMicrotask(() => {
      setSelectedGenres([...incoming]);
    });
  }, [open, book?.id, (book?.genres ?? []).join("|"), didEditGenres, selectedGenres.length]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, onClose]);

  const hasLongDescription = (book?.description?.trim().length ?? 0) > 180;
  const visibleGenres = useMemo(() => selectedGenres.slice(0, 3), [selectedGenres]);
  const hiddenGenreCount = Math.max(0, selectedGenres.length - visibleGenres.length);

  if (!open || !book) return null;

  return (
    <div className="fixed inset-0 z-[260] flex flex-col justify-end bg-black/45 p-0 sm:p-4 sm:items-center sm:justify-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Dismiss add to shelf sheet"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-shelf-title"
        className="relative z-10 flex w-full max-h-[calc(100dvh-0.35rem)] flex-col rounded-t-[1.25rem] border border-border bg-background shadow-2xl sm:max-h-[min(90dvh,760px)] sm:max-w-md sm:rounded-2xl"
      >
        <div className="shrink-0 border-b border-border/60 bg-background/95 px-3.5 pb-2.5 pt-3.5">
          <div className="flex items-start justify-between gap-3">
            <h2 id="add-to-shelf-title" className="font-serif text-2xl font-semibold text-foreground">
              Add to shelf
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card-surface text-lg leading-none text-foreground-muted"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-3.5 pb-[max(6.5rem,env(safe-area-inset-bottom))] pt-2.5 sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="mt-2.5 flex items-start gap-2.5">
            <CoverThumb
              src={book.coverUrl}
              alt={`Cover: ${book.title}`}
              sizes="76px"
              fallbackLetter={book.title}
              className="relative h-[114px] w-[76px] shrink-0 overflow-hidden rounded-lg bg-border shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-serif text-lg font-semibold leading-tight text-foreground">
                {book.title}
              </p>
              <p className="mt-0.5 text-xs font-medium text-accent">{book.author}</p>
              <p
                className={`mt-1.5 text-xs leading-relaxed text-foreground-muted ${
                  showFullDescription ? "" : "line-clamp-4"
                }`}
              >
                {book.description?.trim() || "No description available."}
              </p>
              {hasLongDescription ? (
                <button
                  type="button"
                  onClick={() => setShowFullDescription((v) => !v)}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent"
                >
                  {showFullDescription ? "Less" : "More"}
                  <span aria-hidden className={`transition-transform ${showFullDescription ? "rotate-180" : ""}`}>⌄</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className="my-4 border-t border-border/80" />

          <p className="font-serif text-xl font-semibold text-foreground">Choose a shelf</p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {SHELF_OPTIONS.map((opt) => {
              const selected = activeShelf === opt.shelf;
              return (
                <button
                  key={opt.shelf}
                  type="button"
                  onClick={() => {
                    setActiveShelf(opt.shelf);
                    onChooseShelf(opt.shelf, selectedGenres, makePrivate ? "private" : "public");
                  }}
                  className={`flex min-h-[90px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center ${
                    selected
                      ? "border-accent/70 bg-accent-soft/40 text-accent"
                      : "border-border bg-card-surface text-foreground"
                  }`}
                >
                  <span>{shelfIcon(opt.shelf)}</span>
                  <span className="text-sm font-medium leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-border bg-card-surface px-2.5 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-accent">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="4.5" y="11" width="15" height="9" rx="2" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">Private book</p>
                  <p className="mt-0.5 text-[11px] text-foreground-muted">
                    Only you can see the title, cover, notes, and details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={makePrivate}
                onClick={() => setMakePrivate((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${
                  makePrivate ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    makePrivate ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-3">
            <p className="font-serif text-xl font-semibold text-foreground">Genres</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {visibleGenres.length > 0 ? (
                visibleGenres.map((g) => (
                  <li
                    key={g}
                    className="rounded-full border border-border bg-card-surface px-2.5 py-0.5 text-[11px] font-medium text-foreground-muted"
                  >
                    {g}
                  </li>
                ))
              ) : (
                <li className="rounded-full border border-border bg-card-surface px-2.5 py-0.5 text-[11px] text-foreground-muted">
                  No genres
                </li>
              )}
              {hiddenGenreCount > 0 ? (
                <li className="rounded-full border border-border bg-card-surface px-2.5 py-0.5 text-[11px] font-medium text-foreground-muted">
                  +{hiddenGenreCount}
                </li>
              ) : null}
            </ul>
            <button
              type="button"
              onClick={() => setEditingGenres((v) => !v)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-accent"
            >
              Edit genres
              <span aria-hidden className={`transition-transform ${editingGenres ? "rotate-90" : ""}`}>›</span>
            </button>
            {editingGenres ? (
              <div className="mt-2 rounded-2xl border border-border bg-card-surface p-2">
                <GenreChipPicker
                  value={selectedGenres}
                  onChange={(next) => {
                    setDidEditGenres(true);
                    setSelectedGenres(next);
                  }}
                  searchable
                  variant="shelfPicker"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

