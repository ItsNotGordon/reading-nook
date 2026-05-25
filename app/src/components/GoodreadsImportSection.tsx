"use client";

import { useCallback, useRef, useState } from "react";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useReadingNook } from "@/lib/app-state";
import {
  parseGoodreadsCsv,
  buildImportPlan,
  mergeImportIntoState,
  backfillGenresFromDuplicates,
  stripSeriesInfo,
  type ImportSummary,
} from "@/lib/goodreadsImport";
import type { Book } from "@/lib/types";
import type { SearchBookResult, BookSearchResponse } from "@/lib/bookProviders/types";

type Stage = "idle" | "preview" | "enriching" | "done";

type EnrichProgress = {
  done: number;
  total: number;
  matched: number;
};

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;

async function lookupIsbn(isbn: string): Promise<SearchBookResult | null> {
  if (!isbn) return null;
  try {
    const res = await fetch(`/api/books/isbn?isbn=${encodeURIComponent(isbn)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { book: SearchBookResult | null };
    return data.book ?? null;
  } catch {
    return null;
  }
}

async function searchByTitle(
  title: string,
  author: string,
): Promise<SearchBookResult | null> {
  const cleanTitle = stripSeriesInfo(title);
  const q = `${cleanTitle} ${author}`.trim();
  if (q.length < 2) return null;
  try {
    const res = await fetch(
      `/api/books/search?q=${encodeURIComponent(q)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as BookSearchResponse;
    if (!data.books || data.books.length === 0) return null;
    const norm = (s: string) =>
      s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const normTitle = norm(cleanTitle);
    for (const book of data.books) {
      const bookNorm = norm(book.title);
      if (bookNorm === normTitle || bookNorm.startsWith(normTitle)) {
        return book;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function enrichCatalogBook(existing: Book, ol: SearchBookResult): Book {
  return {
    ...existing,
    id: ol.id,
    title: ol.title || existing.title,
    author: ol.author !== "Unknown" ? ol.author : existing.author,
    coverUrl: ol.coverUrl || existing.coverUrl,
    totalPages: ol.totalPages > 0 ? ol.totalPages : existing.totalPages,
    genres: ol.genres.length > 0 ? ol.genres : existing.genres,
    description: ol.description || existing.description,
    publishedYear: ol.publishedYear ?? existing.publishedYear,
    averageRating: ol.averageRating ?? existing.averageRating,
    ratingsCount: ol.ratingsCount ?? existing.ratingsCount,
    readinglogCount: ol.readinglogCount ?? existing.readinglogCount,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function GoodreadsImportSection() {
  const { state, actions } = useReadingNook();
  const { user: cloudUser, configured: cloudConfigured } = useSupabaseAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<EnrichProgress | null>(
    null,
  );
  const cancelRef = useRef(false);

  function handleFile(file: File) {
    setMessage(null);
    void file
      .text()
      .then((text) => {
        const grRows = parseGoodreadsCsv(text);
        const plan = buildImportPlan(grRows, state);
        setSummary(plan);
        setStage("preview");
      })
      .catch((err: unknown) => {
        setMessage(
          err instanceof Error ? err.message : "Could not read CSV file.",
        );
      });
  }

  const handleConfirm = useCallback(async () => {
    if (!summary) return;
    cancelRef.current = false;
    setStage("enriching");

    const rows = [...summary.importRows];
    const withIsbn = rows.filter((r) => r.isbn || r.isbn13);
    const total = withIsbn.length;
    let matched = 0;
    let done = 0;
    setEnrichProgress({ done: 0, total, matched: 0 });

    for (let i = 0; i < withIsbn.length; i += BATCH_SIZE) {
      if (cancelRef.current) break;
      const batch = withIsbn.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (row) => {
          const isbn = row.isbn13 || row.isbn;
          const ol = await lookupIsbn(isbn);
          return { row, ol };
        }),
      );

      for (const { row, ol } of results) {
        if (ol && !state.userBooks[ol.id]) {
          row.catalogBook = enrichCatalogBook(row.catalogBook, ol);
          matched++;
        }
        done++;
      }

      setEnrichProgress({ done, total, matched });

      if (i + BATCH_SIZE < withIsbn.length && !cancelRef.current) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    if (cancelRef.current) {
      setStage("preview");
      setEnrichProgress(null);
      return;
    }

    // Phase 2: title+author search for books that weren't enriched via ISBN
    const PLACEHOLDER = "https://placehold.co/";
    const unenriched = rows.filter(
      (r) => !r.isbn && !r.isbn13 && r.catalogBook.coverUrl.startsWith(PLACEHOLDER),
    );
    if (unenriched.length > 0) {
      const searchTotal = total + unenriched.length;
      for (let i = 0; i < unenriched.length; i += BATCH_SIZE) {
        if (cancelRef.current) break;
        const batch = unenriched.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (row) => {
            const ol = await searchByTitle(row.title, row.author);
            return { row, ol };
          }),
        );
        for (const { row, ol } of results) {
          if (ol && !state.userBooks[ol.id]) {
            row.catalogBook = enrichCatalogBook(row.catalogBook, ol);
            matched++;
          }
          done++;
        }
        setEnrichProgress({ done, total: searchTotal, matched });
        if (i + BATCH_SIZE < unenriched.length && !cancelRef.current) {
          await sleep(BATCH_DELAY_MS);
        }
      }
    }

    if (cancelRef.current) {
      setStage("preview");
      setEnrichProgress(null);
      return;
    }

    let merged = mergeImportIntoState(state, rows);

    // Backfill genres from Goodreads bookshelves onto existing books with no genres
    if (summary.duplicateRows.length > 0) {
      const { patchedCount, catalog } = backfillGenresFromDuplicates(
        summary.duplicateRows,
        merged,
      );
      if (patchedCount > 0) {
        merged = { ...merged, catalog };
      }
    }

    actions.hydrateLibrary(merged);
    if (cloudConfigured && cloudUser) {
      void fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: merged }),
      });
    }
    setStage("done");
    setMessage(
      `Imported ${summary.toImport} book${summary.toImport === 1 ? "" : "s"} (${matched} matched on Open Library).`,
    );
    setSummary(null);
    setEnrichProgress(null);
  }, [summary, state, actions, cloudConfigured, cloudUser]);

  function handleCancel() {
    if (stage === "enriching") {
      cancelRef.current = true;
    }
    setStage("idle");
    setSummary(null);
    setMessage(null);
    setEnrichProgress(null);
  }

  return (
    <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <p className="text-sm font-semibold text-foreground">
        Import from Goodreads
      </p>
      <p className="mt-1 text-xs text-foreground-muted">
        Upload your Goodreads library export CSV. Go to{" "}
        <a
          href="https://www.goodreads.com/review/import"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline"
        >
          goodreads.com/review/import
        </a>{" "}
        and click &quot;Export Library&quot; to get the file. Books already in
        your library will be skipped.
      </p>

      {stage === "idle" || stage === "done" ? (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
          >
            Choose CSV file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
        </>
      ) : null}

      {stage === "preview" && summary ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl border border-border bg-background p-3 text-xs">
            <p className="font-semibold text-foreground">Import preview</p>
            <ul className="mt-2 space-y-1 text-foreground-muted">
              <li>
                Total rows parsed:{" "}
                <span className="font-medium text-foreground">
                  {summary.totalRows}
                </span>
              </li>
              <li>
                Books to import:{" "}
                <span className="font-medium text-foreground">
                  {summary.toImport}
                </span>
              </li>
              {summary.duplicates > 0 ? (
                <li>
                  Duplicates (skipped):{" "}
                  <span className="font-medium text-foreground">
                    {summary.duplicates}
                  </span>
                </li>
              ) : null}
              {summary.customShelfCount > 0 ? (
                <li>
                  Custom shelves → Want to Read:{" "}
                  <span className="font-medium text-foreground">
                    {summary.customShelfCount}
                  </span>
                </li>
              ) : null}
            </ul>

            {summary.toImport > 0 ? (
              <>
                <p className="mt-2 font-semibold text-foreground">
                  Shelf breakdown
                </p>
                <ul className="mt-1 space-y-0.5 text-foreground-muted">
                  {summary.byShelf.finished > 0 ? (
                    <li>Finished: {summary.byShelf.finished}</li>
                  ) : null}
                  {summary.byShelf.reading > 0 ? (
                    <li>Currently Reading: {summary.byShelf.reading}</li>
                  ) : null}
                  {summary.byShelf.want_to_read > 0 ? (
                    <li>Want to Read: {summary.byShelf.want_to_read}</li>
                  ) : null}
                </ul>

                {summary.byShelf.finished > 0 ? (
                  <>
                    <p className="mt-2 font-semibold text-foreground">
                      Ratings
                    </p>
                    <ul className="mt-1 space-y-0.5 text-foreground-muted">
                      {summary.bySentiment.liked > 0 ? (
                        <li>Liked (4-5★): {summary.bySentiment.liked}</li>
                      ) : null}
                      {summary.bySentiment.okay > 0 ? (
                        <li>Okay (3★): {summary.bySentiment.okay}</li>
                      ) : null}
                      {summary.bySentiment.disliked > 0 ? (
                        <li>
                          Disliked (1-2★): {summary.bySentiment.disliked}
                        </li>
                      ) : null}
                      {summary.bySentiment.unrated > 0 ? (
                        <li>Unrated: {summary.bySentiment.unrated}</li>
                      ) : null}
                    </ul>
                  </>
                ) : null}
              </>
            ) : null}

            {summary.duplicates > 0 ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowDuplicates((v) => !v)}
                  className="text-xs font-medium text-accent"
                >
                  {showDuplicates ? "Hide" : "Show"} duplicates
                </button>
                {showDuplicates ? (
                  <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-foreground-muted">
                    {summary.duplicateRows.map((r) => (
                      <li key={r.bookId} className="truncate">
                        {r.title} — {r.author}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={summary.toImport === 0}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-40 active:bg-accent/80"
            >
              Import {summary.toImport} book{summary.toImport === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      ) : null}

      {stage === "enriching" && enrichProgress ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Matching books on Open Library…
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{
                width: `${enrichProgress.total > 0 ? Math.round((enrichProgress.done / enrichProgress.total) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-foreground-muted">
            {enrichProgress.done} / {enrichProgress.total} checked
            {enrichProgress.matched > 0
              ? ` · ${enrichProgress.matched} matched`
              : ""}
          </p>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="mt-2 text-xs text-foreground-muted">{message}</p>
      ) : null}
    </section>
  );
}
