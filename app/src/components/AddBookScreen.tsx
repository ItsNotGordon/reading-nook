"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useReadingNook } from "@/lib/app-state";
import {
  catalogJsonToBook,
  isCatalogJsonBook,
  type CatalogJsonBook,
} from "@/lib/catalogBook";
import type { Book, Shelf } from "@/lib/types";
import type { SentimentBucket } from "@/lib/types";
import { FinishBookSheet } from "./FinishBookSheet";
import { PairwiseComparisonSheet } from "./PairwiseComparisonSheet";
import { ShelfPickerSheet, shelfDisplayName } from "./ShelfPickerSheet";

const MAX_RESULTS = 20;

export const MIN_QUERY_LENGTH = 2;

function matchesQuery(book: Book, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const genres = book.genres ?? [];
  if (
    book.title.toLowerCase().includes(q) ||
    book.author.toLowerCase().includes(q) ||
    genres.some((g) => g.toLowerCase().includes(q))
  ) {
    return true;
  }
  if (book.publishedYear != null && String(book.publishedYear).includes(q)) {
    return true;
  }
  if (book.ratingsCount != null && String(book.ratingsCount).includes(q)) {
    return true;
  }
  return false;
}

type BookRowProps = {
  book: Book;
  onPick: () => void;
};

function AddBookResultRow({ book, onPick }: BookRowProps) {
  const [coverFailed, setCoverFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full gap-3 rounded-2xl border border-border bg-card-surface p-3 text-left shadow-sm ring-1 ring-black/[0.03] transition-colors active:bg-accent-soft/30"
    >
      <div className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-lg bg-border">
        {!coverFailed ? (
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
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{book.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-foreground-muted">{book.author}</p>
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

type CatalogStatus = "loading" | "ready" | "error";

async function fetchCatalog(): Promise<CatalogJsonBook[]> {
  const res = await fetch("/data/books.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("Not an array");
  return data.filter(isCatalogJsonBook);
}

export type AddBookScreenProps = {
  /** When set with `onQueryChange`, search field is controlled (e.g. Add tab parent). */
  query?: string;
  onQueryChange?: (value: string) => void;
  /** Rendered directly under the catalog search field (e.g. recommendation genre filters). */
  afterSearch?: ReactNode;
};

export function AddBookScreen({ query: queryProp, onQueryChange, afterSearch }: AddBookScreenProps = {}) {
  const { state, actions } = useReadingNook();
  const [internalQuery, setInternalQuery] = useState("");
  const controlled = onQueryChange !== undefined;
  const query = controlled ? (queryProp ?? "") : internalQuery;
  const setQuery = controlled ? onQueryChange : setInternalQuery;
  const [catalogRows, setCatalogRows] = useState<CatalogJsonBook[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pickerBook, setPickerBook] = useState<Book | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [finishBookId, setFinishBookId] = useState<string | null>(null);
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: string | null;
    bucket: SentimentBucket | null;
  }>({ open: false, bookId: null, bucket: null });
  const normalizedQuery = query.trim();
  const queryReady = normalizedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchCatalog();
        if (!cancelled) {
          setCatalogRows(rows);
          setCatalogStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setCatalogRows([]);
          setCatalogStatus("error");
          setLoadError(
            "Could not load the book catalog. From the app folder run: npm run build:books — then refresh this page (or tap Retry).",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const allMatches = useMemo(() => {
    if (catalogStatus !== "ready" || !queryReady) return [];
    const inLibrary = new Set(Object.keys(state.userBooks));
    return catalogRows
      .map((row) => catalogJsonToBook(row))
      .filter((b) => !inLibrary.has(b.id))
      .filter((b) => matchesQuery(b, query));
  }, [catalogRows, catalogStatus, query, queryReady, state.userBooks]);
  const results = useMemo(() => allMatches.slice(0, MAX_RESULTS), [allMatches]);

  const closePicker = useCallback(() => setPickerBook(null), []);

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
    actions.addBookToShelf(pickerBook.id, shelf, pickerBook);
    const verb = existing ? "Moved to" : "Added to";
    setFeedback(`${verb} ${shelfDisplayName(shelf)}.`);
    if (shelf === "finished") {
      setFinishBookId(pickerBook.id);
    }
    closePicker();
  };

  const availableCount = useMemo(() => {
    const inLibrary = new Set(Object.keys(state.userBooks));
    return catalogRows.reduce((count, row) => {
      const id = typeof row.id === "number" ? String(row.id) : String(row.id ?? "");
      return id && !inLibrary.has(id) ? count + 1 : count;
    }, 0);
  }, [catalogRows, state.userBooks]);

  const listEmptyMessage =
    catalogRows.length === 0
      ? "The catalog file is empty. Run npm run build:books to regenerate it."
      : availableCount === 0
        ? "All catalog books are already in your library."
        : "No books match that search. Try another title, author, or genre.";

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
        disabled={catalogStatus === "loading"}
        className="min-h-11 w-full rounded-xl border border-border bg-card-surface px-3.5 py-2.5 text-sm text-foreground shadow-inner outline-none ring-0 transition-shadow placeholder:text-foreground-muted/80 focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)] disabled:cursor-wait disabled:opacity-70"
      />

      {afterSearch ? <div className="min-w-0">{afterSearch}</div> : null}

      {!queryReady && normalizedQuery.length === 0 ? (
        <p className="text-xs text-foreground-muted/90">Matches title, author, or any genre tag in the catalog.</p>
      ) : null}

      {catalogStatus === "error" && loadError ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-5">
          <p className="text-center text-sm leading-relaxed text-foreground-muted">{loadError}</p>
          <button
            type="button"
            onClick={() => {
              setCatalogStatus("loading");
              setLoadError(null);
              setFetchKey((k) => k + 1);
            }}
            className="w-full min-h-11 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
          >
            Retry
          </button>
        </div>
      ) : null}

      {catalogStatus === "loading" ? (
        <p className="rounded-2xl border border-border bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
          Loading catalog…
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
        {catalogStatus === "ready" && !queryReady ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            Type at least {MIN_QUERY_LENGTH} letters to search the catalog.
          </p>
        ) : null}
        {catalogStatus === "ready" && queryReady && results.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            {listEmptyMessage}
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
                  <AddBookResultRow book={book} onPick={() => setPickerBook(book)} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      <ShelfPickerSheet book={pickerBook} onClose={closePicker} onChooseShelf={chooseShelf} />

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
