"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import { PageShell } from "@/components/PageShell";
import { ProfileAccountSection } from "@/components/ProfileAccountSection";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useReadingNook } from "@/lib/app-state";
import { downloadLibraryBackup, readLibraryBackupFile } from "@/lib/libraryBackup";
import { itemsForShelf } from "@/lib/shelfItems";
import { getUserTopGenreRows, topCounts } from "@/lib/userTopGenres";
import {
  sentimentInsightSurface,
  sentimentLabel,
  sentimentTextColor,
} from "@/lib/sentiment-display";
import type { Book, BookId, SentimentBucket, Shelf, UserBook } from "@/lib/types";

type BookWithMeta = { book: Book; userBook: UserBook };

const INSIGHT_BUCKETS: SentimentBucket[] = ["liked", "okay", "disliked"];
const SHELF_SNAPSHOT_COVER_LIMIT = 3;

function shelfSnapshotDetail(label: string, count: number): string {
  const books = count === 1 ? "book" : "books";
  if (label === "Want to Read") return `${count} ${books} on deck`;
  if (label === "Currently Reading") return `${count} ${books} in progress`;
  return `${count} ${books} completed`;
}

function shelfSnapshotHref(shelf: Shelf): string {
  if (shelf === "finished") return "/ratings";
  return `/library?shelf=${shelf}`;
}

function shelfSnapshotDestination(shelf: Shelf): string {
  return shelf === "finished" ? "Ratings" : "Library";
}

function sentimentCount(
  items: BookWithMeta[],
  bucket: SentimentBucket,
): number {
  return items.filter((entry) => entry.userBook.sentimentBucket === bucket).length;
}

function recentTitlesForBucket(
  catalog: Record<BookId, Book>,
  orderedIds: readonly BookId[],
  maxTitles: number,
): string[] {
  const out: string[] = [];
  for (const id of orderedIds) {
    if (out.length >= maxTitles) break;
    const title = catalog[id]?.title?.trim();
    if (title) out.push(title);
  }
  return out;
}

function LeafAccent({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={className}>
      <path
        d="M61 11c20 12 32 32 31 54-1 21-13 38-31 49-19-11-31-28-32-49C28 43 40 23 61 11Z"
        fill="currentColor"
      />
      <path d="M61 22v74" stroke="#ffffff55" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M61 33c-10-2-20 1-27 7" stroke="#ffffff4d" strokeWidth="2" strokeLinecap="round" />
      <path d="M61 46c-10-2-20 1-27 8" stroke="#ffffff4d" strokeWidth="2" strokeLinecap="round" />
      <path d="M61 59c-10-1-18 2-24 8" stroke="#ffffff4d" strokeWidth="2" strokeLinecap="round" />
      <path d="M61 33c10-2 20 1 27 7" stroke="#ffffff4d" strokeWidth="2" strokeLinecap="round" />
      <path d="M61 46c10-2 20 1 27 8" stroke="#ffffff4d" strokeWidth="2" strokeLinecap="round" />
      <path d="M61 59c10-1 18 2 24 8" stroke="#ffffff4d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Two-letter avatar from display name; fallback "RN". */
function profileAvatarInitials(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "RN";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  const w = parts[0] ?? t;
  return w.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const { state, actions } = useReadingNook();
  const { user: cloudUser, configured: cloudConfigured } = useSupabaseAuth();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const initials = profileAvatarInitials(state.profile.displayName);

  const userEntries = useMemo<BookWithMeta[]>(() => {
    const out: BookWithMeta[] = [];
    for (const ub of Object.values(state.userBooks)) {
      if (!ub) continue;
      const book = state.catalog[ub.bookId];
      if (!book) continue;
      out.push({ book, userBook: ub });
    }
    return out;
  }, [state.userBooks, state.catalog]);

  const readingCount = userEntries.filter((e) => e.userBook.shelf === "reading").length;
  const finishedEntries = userEntries.filter((e) => e.userBook.shelf === "finished");
  const finishedCount = finishedEntries.length;
  const wantCount = userEntries.filter((e) => e.userBook.shelf === "want_to_read").length;
  const totalCount = userEntries.length;

  const shelfSnapshotRows = useMemo(
    () =>
      (
        [
          { label: "Currently Reading", shelf: "reading" as const, count: readingCount },
          { label: "Finished", shelf: "finished" as const, count: finishedCount },
          { label: "Want to Read", shelf: "want_to_read" as const, count: wantCount },
        ] as const
      ).map((row) => ({
        ...row,
        covers:
          row.count > 0
            ? itemsForShelf(state.userBooks, state.catalog, row.shelf)
                .slice(0, SHELF_SNAPSHOT_COVER_LIMIT)
                .map((e) => e.book)
            : [],
      })),
    [readingCount, finishedCount, wantCount, state.userBooks, state.catalog],
  );

  const scoredFinished = finishedEntries.filter((e) => e.userBook.derivedScore != null);
  const averageDerivedScore =
    scoredFinished.length > 0
      ? scoredFinished.reduce((sum, e) => sum + (e.userBook.derivedScore ?? 0), 0) /
        scoredFinished.length
      : null;

  const likedCount = sentimentCount(finishedEntries, "liked");
  const okayCount = sentimentCount(finishedEntries, "okay");
  const dislikedCount = sentimentCount(finishedEntries, "disliked");
  const ratedFinishedCount = likedCount + okayCount + dislikedCount;

  const sentimentInsights = INSIGHT_BUCKETS.map((bucket) => {
    const count = sentimentCount(finishedEntries, bucket);
    const share =
      ratedFinishedCount > 0 ? Math.round((count / ratedFinishedCount) * 100) : 0;
    const highlights = recentTitlesForBucket(state.catalog, state.bucketRankings[bucket], 2);
    return { bucket, count, share, highlights };
  });

  const topGenres = getUserTopGenreRows(state, 5);

  const likedFinishedEntries = finishedEntries.filter((e) => e.userBook.sentimentBucket === "liked");
  const authorSource = likedFinishedEntries.length > 0 ? likedFinishedEntries : finishedEntries;
  const topAuthors = topCounts(
    authorSource.map((e) => e.book.author),
    3,
  );

  const favoriteBookId =
    state.bucketRankings.liked[0] ??
    state.bucketRankings.okay[0] ??
    state.bucketRankings.disliked[0] ??
    null;
  const favoriteBook = favoriteBookId ? state.catalog[favoriteBookId] : null;
  const favoriteUserBook = favoriteBookId ? state.userBooks[favoriteBookId] : null;

  return (
    <PageShell>
      {editProfileOpen ? (
        <EditProfileSheet profile={state.profile} onClose={() => setEditProfileOpen(false)} />
      ) : null}
      <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-[#f7f1e7]/80 via-transparent to-transparent px-1 py-1">
        <LeafAccent className="pointer-events-none absolute -left-8 top-3 h-24 w-24 -rotate-[18deg] text-[#7fa483]/35" />
        <LeafAccent className="pointer-events-none absolute -right-10 top-36 h-32 w-32 rotate-[20deg] text-[#9bb391]/30" />
        <LeafAccent className="pointer-events-none absolute -left-12 bottom-28 h-36 w-36 rotate-[10deg] text-[#789b7a]/25" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(245,226,184,0.24),transparent_36%),radial-gradient(circle_at_15%_55%,rgba(128,170,135,0.11),transparent_42%)]" />
        <div className="relative z-10 flex flex-col gap-3">
          {totalCount === 0 ? (
        <>
          <section className="rounded-[1.75rem] border border-border bg-card-surface/95 p-5 text-center shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-border bg-background font-serif text-xl font-semibold text-foreground">
              {initials}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-foreground">
              {state.profile.displayName}
            </h1>
            <p className="mt-1 text-sm italic text-foreground-muted">{state.profile.tagline}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setEditProfileOpen(true)}
                className="min-h-9 rounded-full border border-border bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm active:opacity-90"
              >
                Edit profile
              </button>
              <button
                type="button"
                disabled
                title="Not in this preview"
                className="min-h-9 cursor-not-allowed rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground-muted opacity-70"
              >
                Share library
              </button>
            </div>
          </section>
          <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/75 px-4 py-8 text-center shadow-inner backdrop-blur-[1px]">
            <p className="font-medium text-foreground">Your nook is empty</p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">
              Add a few books to start tracking your reading and taste.
            </p>
            <Link
              href="/add"
              className="mt-4 inline-flex min-h-11 min-w-[8.5rem] items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
            >
              Go to Add
            </Link>
          </div>
        </>
      ) : (
        <>
          <section className="rounded-[1.75rem] border border-border bg-card-surface/95 p-5 text-center shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-border bg-[radial-gradient(circle_at_50%_30%,#f7f2e8_0%,#ece3d3_85%)] font-serif text-xl font-semibold text-foreground">
              {initials}
            </div>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-foreground">
              {state.profile.displayName}
            </h1>
            <p className="mt-1 text-sm italic text-foreground-muted">{state.profile.tagline}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setEditProfileOpen(true)}
                className="min-h-9 rounded-full border border-border bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm active:opacity-90"
              >
                Edit profile
              </button>
              <button
                type="button"
                disabled
                title="Not in this preview"
                className="min-h-9 cursor-not-allowed rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground-muted opacity-70"
              >
                Share library
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-border/80 bg-background px-3 py-3 text-center">
                <p className="text-3xl font-semibold text-[#426447]">{totalCount}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground-muted">Total books</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background px-3 py-3 text-center">
                <p className="text-3xl font-semibold text-foreground">{readingCount}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground-muted">Currently Reading</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background px-3 py-3 text-center">
                <p className="text-3xl font-semibold text-foreground">{finishedCount}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground-muted">Finished</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-background px-3 py-3 text-center">
                <p className="text-3xl font-semibold text-[#a27f00]">
                  {averageDerivedScore == null ? "—" : averageDerivedScore.toFixed(1)}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground-muted">Avg score</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <p className="text-sm font-semibold text-foreground">Favorite book</p>
            {favoriteBook && favoriteUserBook ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/80 bg-background p-3">
                <CoverThumb
                  src={favoriteBook.coverUrl}
                  alt=""
                  sizes="56px"
                  fallbackLetter={favoriteBook.title}
                  className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-border"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{favoriteBook.title}</p>
                  <p className="truncate text-xs text-foreground-muted">{favoriteBook.author}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-foreground-muted">
                Finish and rank a few books to reveal your favorite.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <p className="text-sm font-semibold text-foreground">
              &#10023; Your Top Genres
            </p>
            {topGenres.length > 0 ? (
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {topGenres.map((g, idx) => (
                  <li
                    key={g.label}
                    className="rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-foreground-muted">{String(idx + 1).padStart(2, "0")}</p>
                    <p className="mt-0.5 line-clamp-1 font-medium">{g.label}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-foreground-muted">No genre data yet.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <p className="text-sm font-semibold text-foreground">Favorite authors</p>
            {topAuthors.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {topAuthors.map((a) => (
                  <li
                    key={a.label}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {a.label} <span className="text-foreground-muted">({a.count})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-foreground-muted">Finish a few books to surface favorites.</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <p className="text-sm font-semibold text-foreground">Recent insights</p>
            {ratedFinishedCount > 0 ? (
              <p className="mt-1 text-xs text-foreground-muted">
                From {ratedFinishedCount} finished book{ratedFinishedCount === 1 ? "" : "s"} you&apos;ve
                rated
              </p>
            ) : null}
            <div className="mt-3 space-y-2">
              {sentimentInsights.map(({ bucket, count, share, highlights }) => (
                <div
                  key={bucket}
                  className={`rounded-xl border px-3 py-2.5 ${sentimentInsightSurface(bucket)}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-sm font-semibold ${sentimentTextColor(bucket)}`}>
                      {sentimentLabel(bucket)}
                    </p>
                    <p className={`text-sm font-semibold tabular-nums ${sentimentTextColor(bucket)}`}>
                      {count}
                      {ratedFinishedCount > 0 ? (
                        <span className="ml-1 text-xs font-medium opacity-80">({share}%)</span>
                      ) : null}
                    </p>
                  </div>
                  {highlights.length > 0 ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-foreground-muted">
                      Top picks:{" "}
                      <span className="text-foreground">{highlights.join(" · ")}</span>
                    </p>
                  ) : count > 0 ? (
                    <p className="mt-1.5 text-xs text-foreground-muted">
                      Rank books in Ratings to highlight favorites here.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            {finishedCount === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                Taste insights will appear after you finish and rank a few books.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Shelf snapshot
            </p>
            <div className="mt-3 space-y-2">
              {shelfSnapshotRows.map(({ label, shelf, count, covers }) => (
                <Link
                  key={label}
                  href={shelfSnapshotHref(shelf)}
                  className="block rounded-xl border border-border/80 bg-background px-3 py-2.5 transition-colors hover:bg-accent-soft/20 active:bg-accent-soft/40"
                  aria-label={`${label}, ${shelfSnapshotDetail(label, count)}. Open in ${shelfSnapshotDestination(shelf)}.`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-foreground-muted">{label}</p>
                      <p className="mt-0.5 text-sm font-medium text-foreground">
                        {shelfSnapshotDetail(label, count)}
                      </p>
                    </div>
                    {covers.length > 0 ? (
                      <div className="flex shrink-0 gap-1">
                        {covers.map((book) => (
                          <CoverThumb
                            key={book.id}
                            src={book.coverUrl}
                            alt=""
                            sizes="32px"
                            fallbackLetter={book.title}
                            className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-border shadow-sm"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
          )}

          <ProfileAccountSection />

          <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <p className="text-sm font-semibold text-foreground">Library backup</p>
            <p className="mt-1 text-xs text-foreground-muted">
              Export a JSON backup or import on another device. Import replaces your current library
              on this device.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => downloadLibraryBackup(state)}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
              >
                Export backup
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
              >
                Import backup
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  void readLibraryBackupFile(file)
                    .then((next) => {
                      const ok = window.confirm(
                        "Replace your library on this device with this backup? This cannot be undone.",
                      );
                      if (!ok) return;
                      actions.hydrateLibrary(next);
                      setImportMessage("Library imported on this device.");
                      if (cloudConfigured && cloudUser) {
                        void fetch("/api/sync", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ state: next }),
                        });
                      }
                    })
                    .catch((err: unknown) => {
                      setImportMessage(
                        err instanceof Error ? err.message : "Could not import backup.",
                      );
                    });
                }}
              />
            </div>
            {importMessage ? (
              <p className="mt-2 text-xs text-foreground-muted">{importMessage}</p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-dashed border-amber-900/25 bg-card-surface/90 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-900/70">
              Danger zone
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              Remove every book from your shelves, clear progress and ratings, and drop cached book
              metadata on this device.
              {cloudConfigured && cloudUser
                ? " Your cloud copy may remain until you clear it from the database or overwrite it after signing in again."
                : " Data is not sent to a server unless you use cloud sign-in."}{" "}
              You cannot undo this.
            </p>
            <button
              type="button"
              onClick={() => {
                const ok = window.confirm(
                  "Clear all library data from this device? This removes shelves, progress, ratings, rankings, and cached books. This only affects local storage on this device and cannot be undone.",
                );
                if (ok) actions.resetLibrary();
              }}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-amber-900/35 bg-background px-4 text-sm font-semibold text-amber-950 shadow-sm active:bg-amber-100/60"
            >
              Clear all library data
            </button>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
