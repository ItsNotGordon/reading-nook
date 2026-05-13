"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FinishBookSheet } from "@/components/FinishBookSheet";
import { PairwiseComparisonSheet } from "@/components/PairwiseComparisonSheet";
import { ShelfPickerSheet, shelfDisplayName } from "@/components/ShelfPickerSheet";
import { useReadingNook } from "@/lib/app-state";
import { catalogJsonToBook } from "@/lib/catalogBook";
import { getUserTopGenreLabels, sortRecGenresForFilter } from "@/lib/userTopGenres";
import type { Book, SentimentBucket, Shelf } from "@/lib/types";

type Recommendation = {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  genres: string[];
  score: number;
  rawScore?: number;
  rawKind?: string;
  reason: string;
  source: string;
};

type LoadState = "loading" | "ready" | "error";

function isRecommendation(value: unknown): value is Recommendation {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  if (
    typeof row.bookId !== "string" ||
    typeof row.title !== "string" ||
    typeof row.author !== "string" ||
    typeof row.coverUrl !== "string" ||
    !Array.isArray(row.genres) ||
    !row.genres.every((g) => typeof g === "string") ||
    typeof row.score !== "number" ||
    !Number.isFinite(row.score) ||
    typeof row.reason !== "string" ||
    typeof row.source !== "string"
  ) {
    return false;
  }
  if ("rawScore" in row && row.rawScore !== undefined) {
    if (typeof row.rawScore !== "number" || !Number.isFinite(row.rawScore)) return false;
  }
  if ("rawKind" in row && row.rawKind !== undefined && typeof row.rawKind !== "string") {
    return false;
  }
  return true;
}

async function fetchRecommendations(): Promise<Recommendation[]> {
  const res = await fetch("/data/recommendations.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("Recommendations file is not an array.");
  const rows = data.filter(isRecommendation);
  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.bookId.localeCompare(b.bookId);
  });
  return rows;
}

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
  userTopGenreLower,
}: {
  rec: Recommendation;
  onSelect: () => void;
  userTopGenreLower: Set<string>;
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
  const chipBase = "rounded-full border px-2 py-0.5 text-[10px] font-medium";
  const chipMatch = "border-[#b8d4bc] bg-[#e8f2ea] text-[#426447]";
  const chipDefault = "border-border/80 bg-background text-foreground-muted";
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Add ${rec.title} to library`}
        className="w-full rounded-2xl border border-border bg-card-surface p-3 text-left shadow-sm ring-1 ring-black/[0.03] transition-colors active:bg-accent-soft/30"
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
                {typeof rec.rawScore === "number" && Number.isFinite(rec.rawScore) ? (
                  <p className="mt-0.5 text-[11px] text-foreground-muted/80">
                    Avg {rec.rawScore.toFixed(1)}/5
                  </p>
                ) : null}
              </div>
              <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold tabular-nums text-[#426447]">
                {rec.score.toFixed(1)}
              </span>
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
    </li>
  );
}

export function RecsScreen() {
  const { state, actions } = useReadingNook();
  const [status, setStatus] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [fetchKey, setFetchKey] = useState(0);
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

  const chooseShelf = (shelf: Shelf) => {
    if (!pickerBook) return;
    const existing = state.userBooks[pickerBook.id];
    if (existing && existing.shelf === shelf) {
      setFeedback(`Already on ${shelfDisplayName(shelf)}.`);
      closePicker();
      return;
    }
    const catalogEntry = state.catalog[pickerBook.id];
    actions.addBookToShelf(pickerBook.id, shelf, catalogEntry ? undefined : pickerBook);
    const verb = existing ? "Moved to" : "Added to";
    setFeedback(`${verb} ${shelfDisplayName(shelf)}.`);
    if (shelf === "finished") {
      setFinishBookId(pickerBook.id);
    }
    closePicker();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchRecommendations();
        if (!cancelled) {
          setRows(data);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setStatus("error");
          setLoadError(
            "Could not load recommendations yet. Try rebuilding with `npm run build:recs` and then refresh.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const visibleRecs = useMemo(
    () => rows.filter((rec) => !state.userBooks[rec.bookId]),
    [rows, state.userBooks],
  );
  const inLibraryCount = rows.length - visibleRecs.length;

  const userTopGenreLower = useMemo(
    () => new Set(getUserTopGenreLabels(state, 5).map((l) => l.trim().toLowerCase())),
    [state],
  );

  const unionLowerToDisplay = useMemo(() => {
    const m = new Map<string, string>();
    for (const rec of visibleRecs) {
      for (const g of rec.genres) {
        const t = g.trim();
        if (!t) continue;
        const k = t.toLowerCase();
        if (!m.has(k)) m.set(k, t);
      }
    }
    return m;
  }, [visibleRecs]);

  const sortedFilterGenres = useMemo(
    () => sortRecGenresForFilter(state, unionLowerToDisplay),
    [state, unionLowerToDisplay],
  );

  const [selectedGenreLowerKeys, setSelectedGenreLowerKeys] = useState<string[]>([]);

  const activeFilterLowerKeys = useMemo(
    () => selectedGenreLowerKeys.filter((k) => unionLowerToDisplay.has(k)),
    [selectedGenreLowerKeys, unionLowerToDisplay],
  );

  const filteredRecs = useMemo(() => {
    if (activeFilterLowerKeys.length === 0) return visibleRecs;
    const sel = new Set(activeFilterLowerKeys);
    return visibleRecs.filter((rec) =>
      rec.genres.some((g) => sel.has(g.trim().toLowerCase())),
    );
  }, [visibleRecs, activeFilterLowerKeys]);

  const toggleGenreFilter = useCallback((lower: string) => {
    setSelectedGenreLowerKeys((prev) => {
      if (prev.includes(lower)) return prev.filter((k) => k !== lower);
      return [...prev, lower].sort((a, b) => a.localeCompare(b));
    });
  }, []);

  const clearGenreFilters = useCallback(() => setSelectedGenreLowerKeys([]), []);

  const recommendationCount = filteredRecs.length;
  const filterActive = activeFilterLowerKeys.length > 0;

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

      {status === "loading" ? (
        <div className="space-y-2">
          <p className="rounded-2xl border border-border bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            Loading recommendations...
          </p>
        </div>
      ) : null}

      {status === "error" && loadError ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-5">
          <p className="text-center text-sm leading-relaxed text-foreground-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setStatus("loading");
              setFetchKey((k) => k + 1);
            }}
            className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
          >
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" ? (
        rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            No recommendations yet. Run `npm run build:recs` to generate your offline recommendation file.
          </p>
        ) : recommendationCount === 0 && !filterActive ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            Every suggested book is already in your library. Nice reading habit.
          </p>
        ) : recommendationCount === 0 && filterActive ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-6 text-center">
            <p className="text-sm text-foreground-muted">No recommendations for these genres.</p>
            <button
              type="button"
              onClick={clearGenreFilters}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground-muted">
                {recommendationCount} recommendation{recommendationCount === 1 ? "" : "s"}
                {filterActive && visibleRecs.length !== recommendationCount ? (
                  <span className="font-normal text-foreground-muted/80">
                    {" "}
                    (of {visibleRecs.length})
                  </span>
                ) : null}
                {inLibraryCount > 0 ? (
                  <span className="font-normal text-foreground-muted/80">
                    {" "}
                    ({inLibraryCount} already in your library)
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-foreground-muted/90">Tap a book to add it to your library.</p>
            </div>

            {sortedFilterGenres.length > 0 ? (
              <div className="-mx-1">
                <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Filter by genre
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
                  <button
                    type="button"
                    onClick={clearGenreFilters}
                    aria-pressed={!filterActive}
                    className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      !filterActive
                        ? "border-[#426447] bg-[#e8f2ea] text-[#426447]"
                        : "border-border/80 bg-background text-foreground-muted"
                    }`}
                  >
                    All
                  </button>
                  {sortedFilterGenres.map((label) => {
                    const k = label.toLowerCase();
                    const selected = activeFilterLowerKeys.includes(k);
                    const isTop = userTopGenreLower.has(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleGenreFilter(k)}
                        aria-pressed={selected}
                        className={`shrink-0 snap-start rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selected && isTop
                            ? "border-[#426447] bg-[#d4ead7] text-[#2d4a31]"
                            : selected
                              ? "border-accent/45 bg-accent-soft/50 text-foreground"
                              : isTop
                                ? "border-[#b8d4bc]/90 bg-[#f0f7f1] text-[#426447]"
                                : "border-border/80 bg-background text-foreground-muted"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <ul className="space-y-2.5">
              {filteredRecs.map((rec) => (
                <RecommendationCard
                  key={rec.bookId}
                  rec={rec}
                  userTopGenreLower={userTopGenreLower}
                  onSelect={() => openPickerForRec(rec)}
                />
              ))}
            </ul>
          </div>
        )
      ) : null}

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
