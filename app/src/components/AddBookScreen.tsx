"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useReadingNook } from "@/lib/app-state";
import { toAppBook } from "@/lib/bookProviders/types";
import { enrichBook } from "@/lib/enrichOpenLibraryBook";
import { mergeCatalogGenres } from "@/lib/mergeCatalogGenres";
import type { Book, Shelf } from "@/lib/types";
import type { SentimentBucket } from "@/lib/types";
import { FinishBookSheet } from "./FinishBookSheet";
import { OpenBookScoreBadge } from "./OpenBookScoreBadge";
import { PairwiseComparisonSheet } from "./PairwiseComparisonSheet";
import { ShelfPickerSheet, shelfDisplayName } from "./ShelfPickerSheet";

const MAX_RESULTS = 20;
const SEARCH_DEBOUNCE_MS = 300;

export const MIN_QUERY_LENGTH = 2;

type BookRowProps = {
  book: Book;
  onPick: () => void;
  inLibrary: boolean;
  score: number | null;
  scoreBucket: SentimentBucket | null;
};

function AddBookResultRow({ book, onPick, inLibrary, score, scoreBucket }: BookRowProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = Boolean(book.coverUrl) && !coverFailed;

  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full gap-3 rounded-2xl border border-border bg-card-surface p-3 text-left shadow-sm ring-1 ring-black/[0.03] transition-colors active:bg-accent-soft/30"
    >
      <div className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-lg bg-border">
        {showCover ? (
          <Image
            src={book.coverUrl}
            alt={`Cover: ${book.title}`}
            fill
            sizes="48px"
            className="object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent-soft/50 font-serif text-xs font-semibold text-foreground/70">
            {book.title.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{book.title}</p>
          {score != null && scoreBucket ? (
            <OpenBookScoreBadge score={score} bucket={scoreBucket} width={46} height={34} />
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-foreground-muted">{book.author}</p>
        {inLibrary ? (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
            In your library
          </p>
        ) : null}
        {(book.genres ?? []).length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {(book.genres ?? []).slice(0, 3).map((g) => (
              <li
                key={g}
                className="rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground-muted"
              >
                {g}
              </li>
            ))}
            {(book.genres ?? []).length > 3 ? (
              <li className="rounded-full px-1.5 py-0.5 text-[10px] text-foreground-muted">
                +{(book.genres ?? []).length - 3}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </button>
  );
}

type SearchStatus = "idle" | "loading" | "ready" | "error";

async function fetchBookSearch(
  query: string,
  signal: AbortSignal,
): Promise<Book[]> {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`/api/books/search?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Search failed (${res.status})`);
  }
  const data = (await res.json()) as { books: Parameters<typeof toAppBook>[0][] };
  return (data.books ?? []).map(toAppBook);
}

export type AddBookScreenProps = {
  /** When set with `onQueryChange`, search field is controlled (e.g. Add tab parent). */
  query?: string;
  onQueryChange?: (value: string) => void;
  /** Rendered directly under the catalog search field (e.g. recommendation genre filters). */
  afterSearch?: ReactNode;
  minYear?: number | null;
  maxYear?: number | null;
};

function passesYearFilter(book: Book, min: number | null, max: number | null): boolean {
  if (min == null && max == null) return true;
  if (book.publishedYear == null) return false;
  if (min != null && book.publishedYear < min) return false;
  if (max != null && book.publishedYear > max) return false;
  return true;
}

export function AddBookScreen({ query: queryProp, onQueryChange, afterSearch, minYear, maxYear }: AddBookScreenProps = {}) {
  const { state, actions } = useReadingNook();
  const [internalQuery, setInternalQuery] = useState("");
  const controlled = onQueryChange !== undefined;
  const query = controlled ? (queryProp ?? "") : internalQuery;
  const setQuery = controlled ? onQueryChange : setInternalQuery;
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickerBook, setPickerBook] = useState<Book | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [finishBookId, setFinishBookId] = useState<string | null>(null);
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: string | null;
    bucket: SentimentBucket | null;
  }>({ open: false, bookId: null, bucket: null });
  const normalizedQuery = query.trim();
  const queryReady = normalizedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!queryReady) {
      queueMicrotask(() => {
        setSearchStatus("idle");
        setSearchResults([]);
        setLoadError(null);
      });
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      setSearchStatus("loading");
      setLoadError(null);
      void (async () => {
        try {
          const books = await fetchBookSearch(normalizedQuery, controller.signal);
          if (controller.signal.aborted) return;
          setSearchResults(books);
          setSearchStatus("ready");
        } catch (err) {
          if (controller.signal.aborted) return;
          setSearchResults([]);
          setSearchStatus("error");
          setLoadError(
            err instanceof Error ? err.message : "Could not search for books. Try again.",
          );
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalizedQuery, queryReady, retryKey]);

  const yearMin = minYear ?? null;
  const yearMax = maxYear ?? null;
  const allMatches = useMemo(() => {
    if (searchStatus !== "ready" || !queryReady) return [];
    return searchResults
      .filter((b) => passesYearFilter(b, yearMin, yearMax));
  }, [searchResults, searchStatus, queryReady, state.userBooks, yearMin, yearMax]);
  const results = useMemo(() => allMatches.slice(0, MAX_RESULTS), [allMatches]);

  const closePicker = useCallback(() => setPickerBook(null), []);

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 2800);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const chooseShelf = (shelf: Shelf, userGenres: string[], visibility: "public" | "private") => {
    if (!pickerBook) return;
    const picked = pickerBook;
    const existing = state.userBooks[picked.id];
    if (existing && existing.shelf === shelf) {
      setFeedback(`Already on ${shelfDisplayName(shelf)}.`);
      closePicker();
      return;
    }
    closePicker();
    void (async () => {
      const enriched = await enrichBook(picked);
      const book = {
        ...enriched,
        genres: mergeCatalogGenres(enriched.genres, userGenres),
      };
      actions.addBookToShelf(book.id, shelf, book);
      actions.setUserBookVisibility(book.id, visibility);
      const verb = existing ? "Moved to" : "Added to";
      const privacy = visibility === "private" ? " (private)" : "";
      setFeedback(`${verb} ${shelfDisplayName(shelf)}${privacy}.`);
      if (shelf === "finished") {
        setFinishBookId(book.id);
      }
    })();
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="sr-only" htmlFor="add-book-search">
        Search by title, author, or genre
      </label>
      <input
        id="add-book-search"
        type="search"
        autoComplete="off"
        placeholder="Search by title, author, or genre…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-h-11 w-full rounded-xl border border-border bg-card-surface px-3.5 py-2.5 text-base text-foreground shadow-inner outline-none ring-0 transition-shadow placeholder:text-foreground-muted/80 focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
      />

      {afterSearch ? <div className="min-w-0">{afterSearch}</div> : null}

      {!queryReady && normalizedQuery.length === 0 ? (
        <p className="text-xs text-foreground-muted/90">
          Type at least {MIN_QUERY_LENGTH} letters — try a title, author, or genre like Fantasy.
        </p>
      ) : null}

      {searchStatus === "error" && loadError ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-5">
          <p className="text-center text-sm leading-relaxed text-foreground-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setLoadError(null);
              setRetryKey((k) => k + 1);
            }}
            className="w-full min-h-11 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
          >
            Retry
          </button>
        </div>
      ) : null}

      {searchStatus === "loading" && queryReady ? (
        <p className="rounded-2xl border border-border bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
          Searching…
        </p>
      ) : null}

      {feedback ? (
        <div
          role="status"
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-center text-sm font-medium text-foreground shadow-sm"
        >
          {feedback}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {searchStatus === "ready" && queryReady ? (
          <p className="text-center text-xs text-foreground-muted">Results from Google Books</p>
        ) : null}

        {!queryReady && normalizedQuery.length > 0 && normalizedQuery.length < MIN_QUERY_LENGTH ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            Type at least {MIN_QUERY_LENGTH} letters to search.
          </p>
        ) : null}

        {searchStatus === "ready" && queryReady && results.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            No books match that search. Try another title or author.
          </p>
        ) : null}

        {queryReady && results.length > 0 ? (
          <>
            {allMatches.length > MAX_RESULTS ? (
              <p className="text-center text-xs text-foreground-muted">
                Showing {MAX_RESULTS} of {allMatches.length} matches
              </p>
            ) : null}
            <ul className="flex flex-col gap-2.5">
              {results.map((book) => (
                <li key={book.id}>
                  <AddBookResultRow
                    book={book}
                    onPick={() => setPickerBook(book)}
                    inLibrary={Boolean(state.userBooks[book.id])}
                    score={state.userBooks[book.id]?.derivedScore ?? null}
                    scoreBucket={state.userBooks[book.id]?.sentimentBucket ?? null}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <ShelfPickerSheet
        book={pickerBook}
        onClose={closePicker}
        onChooseShelf={chooseShelf}
        initialVisibility={pickerBook && state.userBooks[pickerBook.id]?.visibility === "private" ? "private" : "public"}
        initialShelf={pickerBook ? (state.userBooks[pickerBook.id]?.shelf ?? null) : null}
      />

      {finishBookId && state.catalog[finishBookId] && state.userBooks[finishBookId] ? (
        <FinishBookSheet
          bookId={finishBookId}
          book={state.catalog[finishBookId]}
          userBook={state.userBooks[finishBookId]}
          actions={actions}
          onStartPairwise={(bucket) =>
            setPairwise({ open: true, bookId: finishBookId, bucket })
          }
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
    </div>
  );
}
