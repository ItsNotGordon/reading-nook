"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { BookDetailSheet } from "@/components/BookDetailSheet";
import { PairwiseComparisonSheet } from "@/components/PairwiseComparisonSheet";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { useReadingNook } from "@/lib/app-state";
import { sentimentLabel } from "@/lib/sentiment-display";
import { SENTIMENT_BUCKETS, type BookId, type SentimentBucket } from "@/lib/types";

const BUCKET_ORDER: SentimentBucket[] = ["liked", "okay", "disliked"];

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

export function RatingsPageClient() {
  const { state, actions } = useReadingNook();
  const router = useRouter();
  const searchParams = useSearchParams();
  const genreFilter = searchParams.get("genre");
  const authorFilter = searchParams.get("author");
  const qFilter = searchParams.get("q");
  const bucketParam = searchParams.get("bucket");
  const bucketFilter: SentimentBucket | null =
    bucketParam && (SENTIMENT_BUCKETS as readonly string[]).includes(bucketParam)
      ? (bucketParam as SentimentBucket)
      : null;

  const [detailBookId, setDetailBookId] = useState<BookId | null>(null);
  const [editOrder, setEditOrder] = useState(false);
  const [searchDraft, setSearchDraft] = useState(qFilter ?? "");
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: BookId | null;
    bucket: SentimentBucket | null;
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

  const openDetailBookId = useMemo(() => {
    if (!detailBookId) return null;
    if (!state.catalog[detailBookId] || !state.userBooks[detailBookId]) return null;
    return detailBookId;
  }, [detailBookId, state.catalog, state.userBooks]);

  const hasActiveFilters = Boolean(genreFilter || authorFilter || qFilter || bucketFilter);

  const setQueryParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value.trim() !== "") params.set(key, value.trim());
      else params.delete(key);
      const qs = params.toString();
      router.replace(qs ? `/ratings?${qs}` : "/ratings");
    },
    [router, searchParams],
  );

  const clearFilters = () => {
    setSearchDraft("");
    router.replace("/ratings");
  };

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
        };
        return rowMatchesFilters(row, genreFilter, authorFilter, qFilter, bucketFilter);
      });
      return { bucket, ids };
    });
  }, [state, genreFilter, authorFilter, qFilter, bucketFilter]);

  return (
    <ThemedPageShell title="Ratings">
      {openDetailBookId ? (
        <BookDetailSheet
          bookId={openDetailBookId}
          onClose={() => setDetailBookId(null)}
          onStartPairwise={(bookId, bucket) => {
            setDetailBookId(null);
            setPairwise({ open: true, bookId, bucket });
          }}
        />
      ) : null}

      {pairwise.open && pairwise.bookId && pairwise.bucket ? (
        <PairwiseComparisonSheet
          newBookId={pairwise.bookId}
          bucket={pairwise.bucket}
          onDone={() => setPairwise({ open: false, bookId: null, bucket: null })}
        />
      ) : null}

      <div className="sticky top-0 z-20 -mx-1 space-y-2 rounded-2xl border border-border/80 bg-background/95 px-3 py-3 shadow-sm backdrop-blur-sm">
        <label htmlFor="ratings-search" className="sr-only">
          Search title, author, genre, or notes
        </label>
        <input
          id="ratings-search"
          type="search"
          placeholder="Search title, author, genre, or notes…"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQueryParam("q", searchDraft);
          }}
          className="min-h-11 w-full rounded-xl border border-border bg-card-surface px-3.5 py-2.5 text-base text-foreground shadow-inner outline-none focus:border-accent/50"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setQueryParam("q", searchDraft)}
            className="min-h-9 rounded-xl border border-border bg-card-surface px-3 text-xs font-semibold text-foreground"
          >
            Search
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-9 rounded-xl border border-border bg-card-surface px-3 text-xs font-semibold text-foreground"
            >
              Clear filters
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setEditOrder((v) => !v)}
            className={`ml-auto min-h-9 rounded-xl border px-3 text-xs font-semibold ${
              editOrder
                ? "border-accent bg-accent text-white"
                : "border-border bg-background text-foreground"
            }`}
          >
            {editOrder ? "Done reordering" : "Edit order"}
          </button>
        </div>
        {hasActiveFilters ? (
          <div className="flex flex-wrap gap-1.5">
            {genreFilter ? (
              <span className="rounded-full border border-border bg-card-surface px-2.5 py-1 text-xs">
                Genre: {genreFilter}
              </span>
            ) : null}
            {authorFilter ? (
              <span className="rounded-full border border-border bg-card-surface px-2.5 py-1 text-xs">
                Author: {authorFilter}
              </span>
            ) : null}
            {qFilter ? (
              <span className="rounded-full border border-border bg-card-surface px-2.5 py-1 text-xs">
                Search: {qFilter}
              </span>
            ) : null}
            {bucketFilter ? (
              <span className="rounded-full border border-border bg-card-surface px-2.5 py-1 text-xs">
                {sentimentLabel(bucketFilter)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {filteredRows.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center">
          <p className="text-sm leading-relaxed text-foreground-muted">
            {mergedRows.length === 0
              ? "No rated books yet. Finish a book and pick how you felt about it to build your list."
              : "No books match these filters."}
          </p>
          {mergedRows.length === 0 ? (
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
                            <p className="truncate text-sm font-semibold text-foreground">{b.title}</p>
                            <p className="truncate text-xs text-foreground-muted">{b.author}</p>
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
          <p className="px-0.5 text-xs font-medium text-foreground-muted">
            {filteredRows.length} title{filteredRows.length === 1 ? "" : "s"}, your ranked order
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm ring-1 ring-black/[0.03]">
            <ol>
              {filteredRows.map((vm, idx) => (
                <li key={vm.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setDetailBookId(vm.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-accent-soft/25 active:bg-accent-soft/35"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <CoverThumb
                        src={vm.coverUrl}
                        alt=""
                        sizes="36px"
                        fallbackLetter={vm.title}
                        className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-border"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground-muted">#{idx + 1}</p>
                        <p className="truncate text-sm font-semibold text-foreground">{vm.title}</p>
                        <p className="truncate text-xs text-foreground-muted">{vm.author}</p>
                      </div>
                    </div>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold tabular-nums ${scoreColor(
                        vm.bucket,
                      )}`}
                      aria-label={vm.score != null ? `Rating ${vm.score.toFixed(1)}` : "Unrated"}
                    >
                      {vm.score != null ? vm.score.toFixed(1) : "—"}
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </ThemedPageShell>
  );
}
