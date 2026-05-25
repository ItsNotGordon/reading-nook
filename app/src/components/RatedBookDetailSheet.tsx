"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { GenreChipPicker } from "@/components/GenreChipPicker";
import { MoveShelfSheet } from "@/components/MoveShelfSheet";
import { SentimentPicker } from "@/components/SentimentPicker";
import { useReadingNook } from "@/lib/app-state";
import { sentimentLabel } from "@/lib/sentiment-display";
import type { BookId, SentimentBucket, Shelf } from "@/lib/types";

type RatedBookDetailSheetProps = {
  bookId: BookId;
  onClose: () => void;
  onStartPairwise?: (bookId: BookId, bucket: SentimentBucket) => void;
};

function scoreColorClass(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#426447]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

function formatFinishedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

const BUCKET_ORDER: SentimentBucket[] = ["liked", "okay", "disliked"];

export function RatedBookDetailSheet({ bookId, onClose, onStartPairwise }: RatedBookDetailSheetProps) {
  const { state, actions } = useReadingNook();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const book = state.catalog[bookId];
  const ub = state.userBooks[bookId];

  const displayBucket = useMemo((): SentimentBucket => {
    const u = state.userBooks[bookId];
    if (!u) return "okay";
    if (u.sentimentBucket) return u.sentimentBucket;
    for (const b of BUCKET_ORDER) {
      if (state.bucketRankings[b]?.includes(bookId)) return b;
    }
    return "okay";
  }, [state.userBooks, state.bucketRankings, bookId]);

  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [editingGenres, setEditingGenres] = useState(false);
  const [draftGenres, setDraftGenres] = useState<string[]>([]);
  const [changingSentiment, setChangingSentiment] = useState(false);
  const [moveShelfOpen, setMoveShelfOpen] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  if (!book || !ub) {
    return null;
  }

  const rowBook = book;
  const rowUb = ub;

  const score = rowUb.derivedScore;

  const saveNotes = (): void => {
    actions.updateUserBookNotes(bookId, draftNotes);
    setEditingNotes(false);
  };

  const cancelNoteEdit = (): void => {
    setDraftNotes(rowUb.notes ?? "");
    setEditingNotes(false);
  };

  const saveGenres = (): void => {
    actions.updateCatalogGenres(bookId, draftGenres);
    setEditingGenres(false);
  };

  const cancelGenreEdit = (): void => {
    setDraftGenres([...rowBook.genres]);
    setEditingGenres(false);
  };

  const startGenreEdit = (): void => {
    setDraftGenres([...rowBook.genres]);
    setEditingGenres(true);
  };

  const chooseSentiment = (bucket: SentimentBucket): void => {
    if (displayBucket === bucket) {
      setChangingSentiment(false);
      return;
    }
    const existingIds = (state.bucketRankings[bucket] ?? []).filter((id) => id !== bookId);
    if (existingIds.length === 0) {
      actions.insertBookIntoBucketAtIndex(bookId, bucket, 0);
      setChangingSentiment(false);
      return;
    }
    onStartPairwise?.(bookId, bucket);
    setChangingSentiment(false);
  };

  const moveToShelf = (shelf: Shelf): void => {
    if (shelf === "finished") return;
    actions.moveBookToShelf(bookId, shelf);
    setMoveShelfOpen(false);
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
        <div className="relative z-10 max-h-[min(90vh,640px)] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="max-h-[min(90vh,640px)] overflow-y-auto">
            <div className="border-b border-border px-4 pb-3 pt-3">
              <div className="flex items-start gap-3">
                <CoverThumb
                  src={rowBook.coverUrl}
                  alt=""
                  sizes="48px"
                  fallbackLetter={rowBook.title}
                  className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-border"
                />
                <div className="min-w-0 flex-1">
                  <p id={headingId} className="font-serif text-lg font-semibold leading-snug text-foreground">
                    {rowBook.title}
                  </p>
                  <p className="mt-1 text-sm text-foreground-muted">{rowBook.author}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => onClose()}
                  className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card-surface text-foreground-muted hover:text-foreground"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-card-surface text-lg font-semibold tabular-nums ${scoreColorClass(
                    displayBucket,
                  )}`}
                  aria-label={score != null ? `Rating ${score.toFixed(1)}` : "Unrated"}
                >
                  {score != null ? score.toFixed(1) : "—"}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    How you felt
                  </p>
                  <p className="text-sm font-medium text-foreground">{sentimentLabel(displayBucket)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  Finished
                </p>
                <p className="mt-1 text-sm text-foreground">{formatFinishedAt(rowUb.finishedAt)}</p>
              </div>

              <div className="space-y-2 border-t border-dashed border-border/70 pt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setChangingSentiment((v) => !v)}
                    className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground active:bg-accent-soft/35"
                  >
                    Change how I felt
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoveShelfOpen(true)}
                    className="min-h-10 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground active:bg-accent-soft/35"
                  >
                    Move to shelf…
                  </button>
                </div>
                {changingSentiment ? (
                  <div className="space-y-2">
                    <p className="text-xs text-foreground-muted">
                      Pick a new feeling — you may rank it in your list.
                    </p>
                    <SentimentPicker value={displayBucket} onChoose={chooseSentiment} />
                  </div>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Genres
                  </p>
                  {!editingGenres ? (
                    <button
                      type="button"
                      onClick={() => startGenreEdit()}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      {rowBook.genres.length > 0 ? "Edit" : "Add genres"}
                    </button>
                  ) : null}
                </div>
                {editingGenres ? (
                  <div className="mt-2 space-y-2">
                    <GenreChipPicker value={draftGenres} onChange={setDraftGenres} searchable />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => cancelGenreEdit()}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground-muted hover:bg-card-surface"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveGenres()}
                        className="rounded-xl border border-border bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                      >
                        Save genres
                      </button>
                    </div>
                  </div>
                ) : rowBook.genres.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {rowBook.genres.map((g) => (
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

              <div className="border-t border-dashed border-border/70 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    Notes
                  </p>
                  {!editingNotes ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftNotes(rowUb.notes ?? "");
                        setEditingNotes(true);
                      }}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
                {editingNotes ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      maxLength={8000}
                      rows={5}
                      className="w-full resize-y rounded-xl border border-border bg-card-surface px-3 py-2 text-sm text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
                      aria-label="Book notes"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => cancelNoteEdit()}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground-muted hover:bg-card-surface"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveNotes()}
                        className="rounded-xl border border-border bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                      >
                        Save notes
                      </button>
                    </div>
                  </div>
                ) : (rowUb.notes ?? "").trim() !== "" ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {rowUb.notes ?? ""}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-foreground-muted">No notes yet. Tap Edit to add some.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border px-4 py-4">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card-surface"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    !window.confirm(`Remove "${rowBook.title}" from your library? This will also remove its rating.`)
                  ) {
                    return;
                  }
                  actions.removeUserBook(bookId);
                  onClose();
                }}
                className="w-full rounded-xl border border-red-200 bg-background py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
              >
                Remove from library
              </button>
            </div>
          </div>
        </div>
      </div>

      {moveShelfOpen ? (
        <MoveShelfSheet
          book={rowBook}
          onChoose={moveToShelf}
          onClose={() => setMoveShelfOpen(false)}
        />
      ) : null}
    </dialog>
  );
}
