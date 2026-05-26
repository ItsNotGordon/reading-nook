"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FinishBookSheet } from "@/components/FinishBookSheet";
import { PairwiseComparisonSheet } from "@/components/PairwiseComparisonSheet";
import { ShelfPickerSheet, shelfDisplayName } from "@/components/ShelfPickerSheet";
import { useReadingNook } from "@/lib/app-state";
import { catalogJsonToBook } from "@/lib/catalogBook";
import { mergeCatalogGenres } from "@/lib/mergeCatalogGenres";
import { sentimentFromPredictedScore } from "@/lib/predictRecommendedScore";
import { sentimentTextColor } from "@/lib/sentiment-display";
import type { RecommendationsPoolModel, Recommendation } from "@/lib/useRecommendationsPool";
import { RECS_VISIBLE_COUNT } from "@/lib/useRecommendationsPool";
import type { Book, SentimentBucket, Shelf } from "@/lib/types";

function recommendationToBook(rec: Recommendation): Book {
  return catalogJsonToBook({
    id: rec.bookId,
    title: rec.title,
    author: rec.author,
    coverUrl: rec.coverUrl,
    genres: rec.genres,
  });
}

function RecommendationCard({
  rec,
  onSelect,
  onDismiss,
  userTopGenreLower,
  personalizationActive,
}: {
  rec: Recommendation;
  onSelect: () => void;
  onDismiss?: () => void;
  userTopGenreLower: Set<string>;
  personalizationActive: boolean;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const orderedGenres = useMemo(() => {
    return [...rec.genres].sort((a, b) => {
      const ma = userTopGenreLower.has(a.trim().toLowerCase()) ? 0 : 1;
      const mb = userTopGenreLower.has(b.trim().toLowerCase()) ? 0 : 1;
      if (ma !== mb) return ma - mb;
      return a.localeCompare(b);
    });
  }, [rec.genres, userTopGenreLower]);
  const topGenres = orderedGenres.slice(0, 3);
  const scoreBucket = sentimentFromPredictedScore(rec.score);
  const chipBase = "rounded-full border px-2 py-0.5 text-[10px] font-medium";
  const chipMatch = "border-border/80 bg-background text-accent";
  const chipDefault = "border-border/80 bg-background text-foreground-muted";
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm ring-1 ring-black/[0.03]">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Add ${rec.title} to library`}
        className="w-full p-3 text-left transition-colors active:bg-accent-soft/30"
      >
        <div className="flex items-start gap-3">
          <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-border">
            {!coverFailed ? (
              <Image
                src={rec.coverUrl}
                alt={`Cover: ${rec.title}`}
                fill
                sizes="64px"
                className="object-cover"
                onError={() => setCoverFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-accent-soft/40 font-serif text-lg font-semibold text-foreground/70">
                {rec.title.slice(0, 1)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{rec.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-foreground-muted">{rec.author}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                {personalizationActive ? (
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-accent">
                    For you
                  </span>
                ) : null}
                <span
                  className={`rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold tabular-nums ${sentimentTextColor(scoreBucket)}`}
                >
                  {rec.score.toFixed(1)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground-muted">{rec.reason}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topGenres.map((g) => (
                <span
                  key={`${rec.bookId}-${g}`}
                  className={`${chipBase} ${
                    userTopGenreLower.has(g.trim().toLowerCase()) ? chipMatch : chipDefault
                  }`}
                >
                  {g}
                </span>
              ))}
              {rec.genres.length > topGenres.length ? (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] text-foreground-muted">
                  +{rec.genres.length - topGenres.length}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-foreground-muted">{rec.source}</p>
          </div>
        </div>
      </button>
      {onDismiss ? (
        <div className="flex justify-end border-t border-border/60 px-3 py-2">
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground-muted shadow-sm active:bg-card-surface"
          >
            Not interested
          </button>
        </div>
      ) : null}
    </li>
  );
}

type RecsListPanelProps = {
  model: RecommendationsPoolModel;
};

export function RecsListPanel({ model }: RecsListPanelProps) {
  const { state, actions } = useReadingNook();
  const {
    rows,
    filteredPool,
    visibleRecs,
    reshuffle,
    filterActive,
    queueAfterFilter,
    hasFilterNoMatches,
    poolExhausted,
    clearGenreFilters,
    userTopGenreLower,
    personalizationActive,
    appNativeEmptyReason,
    discoverLoading,
  } = model;

  const [pickerBook, setPickerBook] = useState<Book | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finishBookId, setFinishBookId] = useState<string | null>(null);
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: string | null;
    bucket: SentimentBucket | null;
  }>({ open: false, bookId: null, bucket: null });

  const closePicker = useCallback(() => setPickerBook(null), []);

  const openPickerForRec = useCallback(
    (rec: Recommendation) => {
      const fromCatalog = state.catalog[rec.bookId];
      setPickerBook(fromCatalog ?? recommendationToBook(rec));
    },
    [state.catalog],
  );

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 2800);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const dismissRec = useCallback(
    (rec: Recommendation) => {
      const catalogBook = state.catalog[rec.bookId] ?? recommendationToBook(rec);
      actions.dismissRec(rec.bookId, catalogBook);
      setFeedback("Removed from recommendations.");
    },
    [actions, state.catalog],
  );

  const chooseShelf = (shelf: Shelf, userGenres: string[]) => {
    if (!pickerBook) return;
    const existing = state.userBooks[pickerBook.id];
    if (existing && existing.shelf === shelf) {
      setFeedback(`Already on ${shelfDisplayName(shelf)}.`);
      closePicker();
      return;
    }
    const catalogEntry = state.catalog[pickerBook.id];
    const base = catalogEntry ?? pickerBook;
    const book = {
      ...base,
      genres: mergeCatalogGenres(base.genres, userGenres),
    };
    actions.addBookToShelf(pickerBook.id, shelf, book);
    const verb = existing ? "Moved to" : "Added to";
    setFeedback(`${verb} ${shelfDisplayName(shelf)}.`);
    if (shelf === "finished") {
      setFinishBookId(pickerBook.id);
    }
    closePicker();
  };

  return (
    <>
      {feedback ? (
        <div
          role="status"
          className="mb-3 rounded-xl border border-border bg-background px-3 py-2.5 text-center text-sm font-medium text-foreground shadow-sm"
        >
          {feedback}
        </div>
      ) : null}

      {discoverLoading ? (
        <div className="space-y-2">
          <p className="rounded-2xl border border-border bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            Finding popular Google Books picks in your genres…
          </p>
        </div>
      ) : null}

      {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            {appNativeEmptyReason ??
              "Finish and rate a book, then search Google Books on Add to build recommendations from your catalog."}
          </p>
        ) : poolExhausted && !filterActive ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            Every suggested book is already in your library. Nice reading habit.
          </p>
        ) : hasFilterNoMatches ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-6 text-center">
            <p className="text-sm text-foreground-muted">No recommendations for these genres.</p>
            <button
              type="button"
              onClick={clearGenreFilters}
              className="min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              {queueAfterFilter > RECS_VISIBLE_COUNT ? (
                <p className="text-xs text-foreground-muted/90">
                  Showing {visibleRecs.length} of {queueAfterFilter} recommendations. Shuffle for
                  a different set.
                </p>
              ) : null}
              <p className="text-xs text-foreground-muted/90">Tap a book to add it to your library.</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={reshuffle}
                disabled={filteredPool.length < 2}
                className="min-h-9 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground disabled:opacity-50"
              >
                Shuffle
              </button>
            </div>

            <ul className="space-y-2.5">
              {visibleRecs.map((rec) => (
                <RecommendationCard
                  key={rec.bookId}
                  rec={rec}
                  userTopGenreLower={userTopGenreLower}
                  personalizationActive={personalizationActive}
                  onSelect={() => openPickerForRec(rec)}
                  onDismiss={() => dismissRec(rec)}
                />
              ))}
            </ul>
          </div>
        )}

      <ShelfPickerSheet book={pickerBook} onClose={closePicker} onChooseShelf={chooseShelf} />

      {finishBookId && state.catalog[finishBookId] && state.userBooks[finishBookId] ? (
        <FinishBookSheet
          bookId={finishBookId}
          book={state.catalog[finishBookId]}
          userBook={state.userBooks[finishBookId]}
          actions={actions}
          onStartPairwise={(bucket) => setPairwise({ open: true, bookId: finishBookId, bucket })}
          onClose={() => setFinishBookId(null)}
        />
      ) : null}

      {pairwise.open && pairwise.bookId && pairwise.bucket ? (
        <PairwiseComparisonSheet
          newBookId={pairwise.bookId}
          bucket={pairwise.bucket}
          onDone={() => setPairwise({ open: false, bookId: null, bucket: null })}
        />
      ) : null}
    </>
  );
}
