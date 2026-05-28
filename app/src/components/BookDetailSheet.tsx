"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { GenreChipPicker } from "@/components/GenreChipPicker";
import { MoveShelfSheet } from "@/components/MoveShelfSheet";
import { SentimentPicker } from "@/components/SentimentPicker";
import { ProgressUpdateSheet } from "@/components/ProgressUpdateSheet";
import { FinishBookSheet } from "@/components/FinishBookSheet";
import { ProgressBar } from "@/components/ProgressBar";
import { useReadingNook } from "@/lib/app-state";
import { sentimentLabel } from "@/lib/sentiment-display";
import { readingProgressDisplayFromBook } from "@/lib/readingProgressDisplay";
import type { BookId, SentimentBucket, Shelf } from "@/lib/types";

type BookDetailSheetProps = {
  bookId: BookId;
  onClose: () => void;
  onStartPairwise?: (bookId: BookId, bucket: SentimentBucket) => void;
};

function scoreColorClass(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#426447]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

function sentimentPillBg(bucket: SentimentBucket): string {
  if (bucket === "liked") return "bg-[#cde9cf] border-[#a3cfa7]";
  if (bucket === "okay") return "bg-[#f5e8b8] border-[#e0d49e]";
  return "bg-[#f6c7c3] border-[#e8aaa5]";
}

function sentimentHeartColor(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#426447]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const BUCKET_ORDER: SentimentBucket[] = ["liked", "okay", "disliked"];

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-1.5"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card-surface text-accent">
        {icon}
      </span>
      <span className="text-[10px] font-medium leading-tight text-foreground-muted text-center">{label}</span>
    </button>
  );
}

function SmileyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

function BookshelfIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function BookDetailSheet({ bookId, onClose, onStartPairwise }: BookDetailSheetProps) {
  const { state, actions } = useReadingNook();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const book = state.catalog[bookId];
  const ub = state.userBooks[bookId];

  const shelf: Shelf | null = ub?.shelf ?? null;

  const displayBucket = useMemo((): SentimentBucket | null => {
    if (!ub || shelf !== "finished") return null;
    if (ub.sentimentBucket) return ub.sentimentBucket;
    for (const b of BUCKET_ORDER) {
      if (state.bucketRankings[b]?.includes(bookId)) return b;
    }
    return null;
  }, [state.userBooks, state.bucketRankings, bookId, ub, shelf]);

  const progress = shelf === "reading" && book && ub ? readingProgressDisplayFromBook(book, ub) : null;

  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [editingGenres, setEditingGenres] = useState(false);
  const [draftGenres, setDraftGenres] = useState<string[]>([]);
  const [changingSentiment, setChangingSentiment] = useState(false);
  const [moveShelfOpen, setMoveShelfOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  if (!book || !ub) return null;

  const score = ub.derivedScore;

  const saveNotes = (): void => {
    actions.updateUserBookNotes(bookId, draftNotes);
    setEditingNotes(false);
  };

  const cancelNoteEdit = (): void => {
    setDraftNotes(ub.notes ?? "");
    setEditingNotes(false);
  };

  const saveGenres = (): void => {
    actions.updateCatalogGenres(bookId, draftGenres);
    setEditingGenres(false);
  };

  const cancelGenreEdit = (): void => {
    setDraftGenres([...book.genres]);
    setEditingGenres(false);
  };

  const startGenreEdit = (): void => {
    setDraftGenres([...book.genres]);
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

  const moveToShelf = (s: Shelf): void => {
    actions.moveBookToShelf(bookId, s);
    setMoveShelfOpen(false);
    onClose();
  };

  const dateLabel = shelf === "finished"
    ? `Finished ${formatDate(ub.finishedAt)}`
    : shelf === "reading"
      ? `Started ${formatDate(ub.addedAt)}`
      : `Added ${formatDate(ub.addedAt)}`;

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
        <div className="relative z-10 max-h-[min(90vh,700px)] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="max-h-[min(90vh,700px)] overflow-y-auto">
            {/* Close button */}
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

            {/* Large centered cover */}
            <div className="flex flex-col items-center px-6 pt-6 pb-4">
              <CoverThumb
                src={book.coverUrl}
                alt={`Cover: ${book.title}`}
                sizes="160px"
                fallbackLetter={book.title}
                className="relative h-[220px] w-[148px] shrink-0 overflow-hidden rounded-xl bg-border shadow-lg"
              />

              {/* Title + Author */}
              <h2
                id={headingId}
                className="mt-4 text-center font-serif text-xl font-semibold leading-snug text-foreground"
              >
                {book.title}
              </h2>
              <p className="mt-1 text-center text-sm text-foreground-muted">{book.author}</p>

              {/* Sentiment pill (finished only) */}
              {shelf === "finished" && displayBucket != null ? (
                <div className={`mt-3 inline-flex items-center gap-0 rounded-full border ${sentimentPillBg(displayBucket)} overflow-hidden`}>
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 ${sentimentHeartColor(displayBucket)}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span className="text-sm font-semibold">{sentimentLabel(displayBucket)}</span>
                  </span>
                  {score != null ? (
                    <span className={`border-l px-3 py-1.5 text-sm font-semibold tabular-nums ${scoreColorClass(displayBucket)} ${displayBucket === "liked" ? "border-[#a3cfa7]" : displayBucket === "okay" ? "border-[#e0d49e]" : "border-[#e8aaa5]"}`}>
                      {score.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {/* Progress bar (reading only) */}
              {shelf === "reading" && progress ? (
                <div className="mt-3 flex w-full max-w-[200px] items-center gap-2">
                  <ProgressBar
                    mode={progress.mode}
                    value={progress.barValue}
                    estimatedBand={progress.estimatedBand}
                    trackClassName="relative h-2 w-full overflow-hidden rounded-full border border-border bg-progress-unread"
                  />
                  <span className="shrink-0 text-xs font-semibold text-foreground-muted">
                    {progress.line1}
                  </span>
                </div>
              ) : null}

              {/* Date line */}
              {dateLabel ? (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-foreground-muted">
                  <CalendarIcon />
                  <span>{dateLabel}</span>
                </div>
              ) : null}
            </div>

            {/* Sentiment picker (when changing feeling) */}
            {changingSentiment ? (
              <div className="space-y-2 px-6 pb-3">
                <p className="text-xs text-foreground-muted">
                  Pick a new feeling — you may rank it in your list.
                </p>
                <SentimentPicker value={displayBucket} onChoose={chooseSentiment} />
              </div>
            ) : null}

            {/* Genres */}
            <div className="px-6 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Genres
                </p>
                {!editingGenres ? (
                  <button
                    type="button"
                    onClick={() => startGenreEdit()}
                    className="text-xs font-semibold text-foreground-muted hover:text-accent"
                  >
                    Edit
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
              ) : book.genres.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {book.genres.map((g) => (
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

            {/* Notes */}
            <div className="px-6 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Notes
                </p>
                {!editingNotes ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftNotes(ub.notes ?? "");
                      setEditingNotes(true);
                    }}
                    className="text-xs font-semibold text-foreground-muted hover:text-accent"
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
                    rows={4}
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
              ) : (ub.notes ?? "").trim() !== "" ? (
                <div className="mt-2 rounded-xl border border-dashed border-border/80 bg-card-surface/60 px-3 py-3 shadow-inner">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground italic">
                    {ub.notes}
                  </p>
                </div>
              ) : (
                <div className="mt-2 rounded-xl border border-dashed border-border/80 bg-card-surface/60 px-3 py-3 shadow-inner">
                  <p className="text-sm italic text-foreground-muted">
                    No notes yet.{"\n"}Tap Edit to add your thoughts.
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons row */}
            <div className="flex items-start justify-center gap-2 px-6 py-4">
              {shelf === "finished" ? (
                <ActionButton
                  icon={<SmileyIcon />}
                  label="Change feeling"
                  onClick={() => setChangingSentiment((v) => !v)}
                />
              ) : shelf === "reading" ? (
                <ActionButton
                  icon={<ProgressIcon />}
                  label="Update progress"
                  onClick={() => setProgressOpen(true)}
                />
              ) : (
                <ActionButton
                  icon={<PlayIcon />}
                  label="Start reading"
                  onClick={() => {
                    actions.moveBookToShelf(bookId, "reading");
                    onClose();
                  }}
                />
              )}
              <ActionButton
                icon={<BookshelfIcon />}
                label="Move to shelf"
                onClick={() => setMoveShelfOpen(true)}
              />
              <ActionButton
                icon={<PencilIcon />}
                label="Edit details"
                onClick={() => {
                  if (shelf === "finished") {
                    setFinishOpen(true);
                    return;
                  }
                  startGenreEdit();
                }}
              />
              <ActionButton
                icon={<NoteIcon />}
                label="Add note"
                onClick={() => {
                  setDraftNotes(ub.notes ?? "");
                  setEditingNotes(true);
                }}
              />
            </div>

            {/* Remove from library */}
            <div className="flex justify-center px-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    !window.confirm(`Remove "${book.title}" from your library?${shelf === "finished" ? " This will also remove its rating." : ""}`)
                  ) {
                    return;
                  }
                  actions.removeUserBook(bookId);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Remove from library
              </button>
            </div>
          </div>
        </div>
      </div>

      {moveShelfOpen ? (
        <MoveShelfSheet
          book={book}
          onChoose={moveToShelf}
          onClose={() => setMoveShelfOpen(false)}
        />
      ) : null}

      {progressOpen && shelf === "reading" ? (
        <ProgressUpdateSheet
          bookId={bookId}
          book={book}
          userBook={ub}
          actions={actions}
          onClose={() => setProgressOpen(false)}
        />
      ) : null}

      {finishOpen ? (
        <FinishBookSheet
          bookId={bookId}
          book={book}
          userBook={ub}
          actions={actions}
          onStartPairwise={(bucket) => {
            onStartPairwise?.(bookId, bucket);
          }}
          onClose={() => setFinishOpen(false)}
        />
      ) : null}
    </dialog>
  );
}
