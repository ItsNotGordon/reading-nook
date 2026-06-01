"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { BookDetailSheet } from "@/components/BookDetailSheet";
import { FinishBookSheet } from "@/components/FinishBookSheet";
import { OpenBookScoreBadge } from "@/components/OpenBookScoreBadge";
import { PairwiseComparisonSheet } from "@/components/PairwiseComparisonSheet";
import { RatingRankCircle } from "@/components/RatingRankCircle";
import { RatingsSentimentFilters } from "@/components/RatingsSentimentFilters";
import { RatingsShelfBookRow } from "@/components/RatingsShelfBookRow";
import { RatingsShelfToggle } from "@/components/RatingsShelfToggle";
import { RatingsSortSelect } from "@/components/RatingsSortSelect";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { useReadingNook } from "@/lib/app-state";
import {
  defaultSortForShelf,
  parseRatingsSortParam,
  sortFinishedRatingRows,
  sortShelfItems,
  type RatingsSortKey,
} from "@/lib/ratingsShelfSort";
import { parseRatingsShelfParam } from "@/lib/shelves";
import { itemsForShelf, type ShelfItem } from "@/lib/shelfItems";
import { sentimentLabel } from "@/lib/sentiment-display";
import { SENTIMENT_BUCKETS, type BookId, type SentimentBucket, type Shelf } from "@/lib/types";

const BUCKET_ORDER: SentimentBucket[] = ["liked", "okay", "disliked"];

const EMPTY_SHELF_MESSAGE: Record<Shelf, string> = {
  finished:
    "No rated books yet. Finish a book and pick how you felt about it to build your list.",
  want_to_read: "No books in Want to Read yet.",
  reading: "No books currently being read.",
  did_not_finish: "No books marked Did Not Finish.",
};

function scoreColor(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#426447]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

type RatingRow = {
  id: BookId;
  title: string;
  author: string;
  coverUrl: string;
  score: number | null;
  bucket: SentimentBucket;
  genres: string[];
  notes: string;
  addedAt: string;
  finishedAt: string | null;
  finishedSortAt: string | null;
};

function rowMatchesFilters(
  row: RatingRow,
  genre: string | null,
  author: string | null,
  q: string | null,
  bucket: SentimentBucket | null,
): boolean {
  if (bucket && row.bucket !== bucket) return false;
  if (genre) {
    const gl = genre.trim().toLowerCase();
    if (!row.genres.some((g) => g.trim().toLowerCase() === gl)) return false;
  }
  if (author) {
    const al = author.trim().toLowerCase();
    if (row.author.trim().toLowerCase() !== al) return false;
  }
  if (q) {
    const ql = q.trim().toLowerCase();
    if (
      !row.title.toLowerCase().includes(ql) &&
      !row.author.toLowerCase().includes(ql) &&
      !row.notes.toLowerCase().includes(ql) &&
      !row.genres.some((g) => g.toLowerCase().includes(ql))
    ) {
      return false;
    }
  }
  return true;
}

function shelfItemMatchesFilters(
  item: ShelfItem,
  genre: string | null,
  author: string | null,
  q: string | null,
): boolean {
  const { book, userBook } = item;
  if (genre) {
    const gl = genre.trim().toLowerCase();
    if (!book.genres.some((g) => g.trim().toLowerCase() === gl)) return false;
  }
  if (author) {
    const al = author.trim().toLowerCase();
    if (book.author.trim().toLowerCase() !== al) return false;
  }
  if (q) {
    const ql = q.trim().toLowerCase();
    const notes = userBook.notes ?? "";
    if (
      !book.title.toLowerCase().includes(ql) &&
      !book.author.toLowerCase().includes(ql) &&
      !notes.toLowerCase().includes(ql) &&
      !book.genres.some((g) => g.toLowerCase().includes(ql))
    ) {
      return false;
    }
  }
  return true;
}

export function RatingsPageClient() {
  const { state, actions } = useReadingNook();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedShelf = parseRatingsShelfParam(searchParams.get("shelf"));
  const isFinishedView = selectedShelf === "finished";
  const selectedSort = parseRatingsSortParam(selectedShelf, searchParams.get("sort"));

  const genreFilter = searchParams.get("genre");
  const authorFilter = searchParams.get("author");
  const qFilter = searchParams.get("q");
  const bucketParam = searchParams.get("bucket");
  const bucketFilter: SentimentBucket | null =
    isFinishedView &&
    bucketParam &&
    (SENTIMENT_BUCKETS as readonly string[]).includes(bucketParam)
      ? (bucketParam as SentimentBucket)
      : null;

  const [detailBookId, setDetailBookId] = useState<BookId | null>(null);
  const [finishBookId, setFinishBookId] = useState<BookId | null>(null);
  const [editOrder, setEditOrder] = useState(false);
  const [searchDraft, setSearchDraft] = useState(qFilter ?? "");
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: BookId | null;
    bucket: SentimentBucket | null;
    shareToFeed?: boolean;
  }>({ open: false, bookId: null, bucket: null });

  const mergedRows = useMemo(() => {
    const rows: RatingRow[] = [];
    for (const bucket of BUCKET_ORDER) {
      const ids = state.bucketRankings[bucket] ?? [];
      for (const id of ids) {
        const b = state.catalog[id];
        const ub = state.userBooks[id];
        if (!b || !ub) continue;
        rows.push({
          id,
          title: b.title,
          author: b.author,
          coverUrl: b.coverUrl,
          score: ub.derivedScore,
          bucket: ub.sentimentBucket ?? bucket,
          genres: b.genres,
          notes: ub.notes ?? "",
          addedAt: ub.addedAt,
          finishedAt: ub.finishedAt,
          finishedSortAt: ub.finishedSortAt,
        });
      }
    }
    return rows;
  }, [state.bucketRankings, state.catalog, state.userBooks]);

  const filteredRows = useMemo(
    () =>
      mergedRows.filter((row) =>
        rowMatchesFilters(row, genreFilter, authorFilter, qFilter, bucketFilter),
      ),
    [mergedRows, genreFilter, authorFilter, qFilter, bucketFilter],
  );

  const shelfItems = useMemo(
    () => itemsForShelf(state.userBooks, state.catalog, selectedShelf),
    [state.userBooks, state.catalog, selectedShelf],
  );

  const filteredShelfItems = useMemo(
    () =>
      shelfItems.filter((item) =>
        shelfItemMatchesFilters(item, genreFilter, authorFilter, qFilter),
      ),
    [shelfItems, genreFilter, authorFilter, qFilter],
  );

  const sortedFilteredRows = useMemo(
    () => sortFinishedRatingRows(filteredRows, selectedSort),
    [filteredRows, selectedSort],
  );

  const sortedShelfItems = useMemo(
    () => sortShelfItems(filteredShelfItems, selectedSort),
    [filteredShelfItems, selectedSort],
  );

  const openDetailBookId = useMemo(() => {
    if (!detailBookId) return null;
    if (!state.catalog[detailBookId] || !state.userBooks[detailBookId]) return null;
    return detailBookId;
  }, [detailBookId, state.catalog, state.userBooks]);

  const hasActiveFilters = Boolean(
    genreFilter || authorFilter || qFilter || (isFinishedView && bucketFilter),
  );

  const replaceRatingsUrl = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      router.replace(qs ? `/ratings?${qs}` : "/ratings");
    },
    [router],
  );

  const setQueryParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value.trim() !== "") params.set(key, value.trim());
      else params.delete(key);
      replaceRatingsUrl(params);
    },
    [searchParams, replaceRatingsUrl],
  );

  const applySortToParams = useCallback(
    (params: URLSearchParams, shelf: Shelf, sort: RatingsSortKey) => {
      if (sort === defaultSortForShelf(shelf)) params.delete("sort");
      else params.set("sort", sort);
    },
    [],
  );

  const setSelectedShelf = useCallback(
    (shelf: Shelf) => {
      const params = new URLSearchParams(searchParams.toString());
      if (shelf === "finished") params.delete("shelf");
      else params.set("shelf", shelf);
      if (shelf !== "finished") params.delete("bucket");
      applySortToParams(params, shelf, defaultSortForShelf(shelf));
      replaceRatingsUrl(params);
      setEditOrder(false);
    },
    [searchParams, replaceRatingsUrl, applySortToParams],
  );

  const setSortParam = useCallback(
    (sort: RatingsSortKey) => {
      const params = new URLSearchParams(searchParams.toString());
      applySortToParams(params, selectedShelf, sort);
      replaceRatingsUrl(params);
    },
    [searchParams, replaceRatingsUrl, selectedShelf, applySortToParams],
  );

  const clearFilters = () => {
    setSearchDraft("");
    const params = new URLSearchParams();
    if (selectedShelf !== "finished") params.set("shelf", selectedShelf);
    applySortToParams(params, selectedShelf, selectedSort);
    replaceRatingsUrl(params);
  };

  const openDetail = useCallback(
    (bookId: BookId) => {
      const ub = state.userBooks[bookId];
      if (!ub) return;
      if (ub.shelf === "finished" && !ub.sentimentBucket) {
        const hasRanking = (["liked", "okay", "disliked"] as SentimentBucket[]).some((b) =>
          state.bucketRankings[b]?.includes(bookId),
        );
        if (!hasRanking) {
          setFinishBookId(bookId);
          return;
        }
      }
      setDetailBookId(bookId);
    },
    [state.userBooks, state.bucketRankings],
  );

  const moveInBucket = (bucket: SentimentBucket, bookId: BookId, delta: -1 | 1) => {
    const ids = [...(state.bucketRankings[bucket] ?? [])];
    const idx = ids.indexOf(bookId);
    if (idx < 0) return;
    const target = idx + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    actions.updateBucketRankings(bucket, ids);
  };

  const bucketSections = useMemo(() => {
    return BUCKET_ORDER.map((bucket) => {
      const ids = (state.bucketRankings[bucket] ?? []).filter((id) => {
        const b = state.catalog[id];
        const ub = state.userBooks[id];
        if (!b || !ub) return false;
        const row: RatingRow = {
          id,
          title: b.title,
          author: b.author,
          coverUrl: b.coverUrl,
          score: ub.derivedScore,
          bucket,
          genres: b.genres,
          notes: ub.notes ?? "",
          addedAt: ub.addedAt,
          finishedAt: ub.finishedAt,
          finishedSortAt: ub.finishedSortAt,
        };
        return rowMatchesFilters(row, genreFilter, authorFilter, qFilter, bucketFilter);
      });
      return { bucket, ids };
    });
  }, [state, genreFilter, authorFilter, qFilter, bucketFilter]);

  const finishedEmpty = mergedRows.length === 0;
  const shelfEmpty = shelfItems.length === 0;

  return (
    <ThemedPageShell title="Ratings">
      {openDetailBookId ? (
        <BookDetailSheet
          bookId={openDetailBookId}
          onClose={() => setDetailBookId(null)}
          onStartPairwise={(bookId, bucket, options) => {
            setDetailBookId(null);
            setPairwise({
              open: true,
              bookId,
              bucket,
              shareToFeed: options?.shareToFeed,
            });
          }}
        />
      ) : null}

      {finishBookId && state.catalog[finishBookId] && state.userBooks[finishBookId] ? (
        <FinishBookSheet
          bookId={finishBookId}
          book={state.catalog[finishBookId]}
          userBook={state.userBooks[finishBookId]}
          actions={actions}
          onStartPairwise={(bucket) => {
            setFinishBookId(null);
            setPairwise({ open: true, bookId: finishBookId, bucket });
          }}
          onClose={() => setFinishBookId(null)}
        />
      ) : null}

      {pairwise.open && pairwise.bookId && pairwise.bucket ? (
        <PairwiseComparisonSheet
          newBookId={pairwise.bookId}
          bucket={pairwise.bucket}
          shareToFeed={pairwise.shareToFeed}
          onDone={() => setPairwise({ open: false, bookId: null, bucket: null })}
        />
      ) : null}

      <div className="sticky top-0 z-20 -mx-1 space-y-1.5 rounded-2xl border border-border/60 bg-background/90 px-2 py-2 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <RatingsShelfToggle selected={selectedShelf} onSelect={setSelectedShelf} />
          </div>
          <RatingsSortSelect
            shelf={selectedShelf}
            value={selectedSort}
            onChange={setSortParam}
            disabled={isFinishedView && editOrder}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="ratings-search" className="sr-only">
            Search
          </label>
          <input
            id="ratings-search"
            type="search"
            placeholder="Search…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setQueryParam("q", searchDraft);
            }}
            className="min-h-8 min-w-0 flex-1 rounded-full border border-border/70 bg-card-surface/80 px-3 py-1 text-sm text-foreground outline-none placeholder:text-foreground-muted/60 focus:border-accent/40"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-foreground-muted hover:text-foreground"
              aria-label="Clear filters"
            >
              Clear
            </button>
          ) : null}
          {isFinishedView ? (
            <button
              type="button"
              onClick={() => setEditOrder((v) => !v)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                editOrder
                  ? "border-accent bg-accent text-white"
                  : "border-border/70 bg-card-surface/80 text-foreground-muted"
              }`}
            >
              {editOrder ? "Done" : "Reorder"}
            </button>
          ) : null}
        </div>

        {isFinishedView ? (
          <RatingsSentimentFilters
            active={bucketFilter}
            onChange={(bucket) => setQueryParam("bucket", bucket)}
          />
        ) : null}
      </div>

      {isFinishedView ? (
        filteredRows.length === 0 ? (
          <div className="space-y-4 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center">
            <p className="text-sm leading-relaxed text-foreground-muted">
              {finishedEmpty
                ? EMPTY_SHELF_MESSAGE.finished
                : "No books match these filters."}
            </p>
            {finishedEmpty ? (
              <Link
                href="/add"
                className="inline-flex min-h-11 min-w-[8.5rem] items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
              >
                Go to Add
              </Link>
            ) : hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : editOrder ? (
          <div className="space-y-6">
            {bucketSections.map(({ bucket, ids }) =>
              ids.length === 0 ? null : (
                <section key={bucket} className="space-y-2">
                  <p className={`px-0.5 text-sm font-semibold ${scoreColor(bucket)}`}>
                    {sentimentLabel(bucket)}
                  </p>
                  <ol className="overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm">
                    {ids.map((id, idx) => {
                      const b = state.catalog[id];
                      const ub = state.userBooks[id];
                      if (!b || !ub) return null;
                      return (
                        <li key={id} className="border-b border-border last:border-b-0">
                          <div className="flex items-center gap-2 px-3 py-3">
                            <CoverThumb
                              src={b.coverUrl}
                              alt=""
                              sizes="36px"
                              fallbackLetter={b.title}
                              className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-border"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {b.title}
                              </p>
                              <p className="truncate text-xs text-foreground-muted">
                                {b.author}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveInBucket(bucket, id, -1)}
                                className="min-h-9 min-w-9 rounded-lg border border-border bg-background text-xs font-semibold disabled:opacity-40"
                                aria-label="Move up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={idx === ids.length - 1}
                                onClick={() => moveInBucket(bucket, id, 1)}
                                className="min-h-9 min-w-9 rounded-lg border border-border bg-background text-xs font-semibold disabled:opacity-40"
                                aria-label="Move down"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ),
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="px-1 text-[11px] text-foreground-muted/80">
              {sortedFilteredRows.length} book{sortedFilteredRows.length === 1 ? "" : "s"}
            </p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm ring-1 ring-black/[0.03]">
              <ol>
                {sortedFilteredRows.map((vm, idx) => (
                  <li key={vm.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => openDetail(vm.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-accent-soft/25 active:bg-accent-soft/35"
                    >
                      <RatingRankCircle rank={idx + 1} />
                      <CoverThumb
                        src={vm.coverUrl}
                        alt=""
                        sizes="36px"
                        fallbackLetter={vm.title}
                        className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{vm.title}</p>
                        <p className="truncate text-xs text-foreground-muted">{vm.author}</p>
                      </div>
                      {vm.score != null ? (
                        <OpenBookScoreBadge
                          score={vm.score}
                          bucket={vm.bucket}
                          width={52}
                          height={36}
                        />
                      ) : (
                        <span
                          className="flex h-[36px] w-[52px] shrink-0 items-center justify-center text-sm font-semibold text-foreground-muted"
                          aria-label="Unrated"
                        >
                          —
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )
      ) : filteredShelfItems.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center">
          <p className="text-sm leading-relaxed text-foreground-muted">
            {shelfEmpty
              ? EMPTY_SHELF_MESSAGE[selectedShelf]
              : "No books match these filters."}
          </p>
          {shelfEmpty ? (
            <Link
              href="/add"
              className="inline-flex min-h-11 min-w-[8.5rem] items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
            >
              Go to Add
            </Link>
          ) : hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="px-1 text-[11px] text-foreground-muted/80">
            {sortedShelfItems.length} book{sortedShelfItems.length === 1 ? "" : "s"}
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm ring-1 ring-black/[0.03]">
            <ol>
              {sortedShelfItems.map((item) => (
                <RatingsShelfBookRow
                  key={item.userBook.bookId}
                  item={item}
                  shelf={selectedShelf}
                  onPress={() => openDetail(item.userBook.bookId)}
                />
              ))}
            </ol>
          </div>
        </div>
      )}
    </ThemedPageShell>
  );
}
