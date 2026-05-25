"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { useReadingNook } from "@/lib/app-state";
import { formatEstimatedPercentRange } from "@/lib/progress";
import { itemsForShelf, type ShelfItem } from "@/lib/shelfItems";

function ContinueReadingCard({ item }: { item: ShelfItem }) {
  const { userBook, book } = item;
  const isExact = userBook.progressMode === "exact" && book.totalPages > 0;
  const exactFraction = isExact
    ? Math.min(1, (userBook.currentPage ?? 0) / book.totalPages)
    : 0;
  const range = userBook.estimatedRange;

  return (
    <Link
      href="/library?shelf=reading"
      className="flex items-center gap-3 rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px] active:bg-accent-soft/20"
    >
      {item.book.coverUrl ? (
        <Image
          src={item.book.coverUrl}
          alt=""
          width={44}
          height={66}
          className="h-[66px] w-[44px] shrink-0 rounded-lg object-cover shadow-sm"
          unoptimized
        />
      ) : (
        <div className="flex h-[66px] w-[44px] shrink-0 items-center justify-center rounded-lg bg-accent-soft/30 text-xs text-foreground-muted">
          Book
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.book.title}
        </p>
        <p className="truncate text-xs text-foreground-muted">
          {item.book.author}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {isExact ? (
            <>
              <ProgressBar
                mode="exact"
                value={exactFraction}
                trackClassName="relative h-1.5 w-full overflow-hidden rounded-full border border-border bg-progress-unread"
              />
              <span className="shrink-0 text-[10px] font-medium text-foreground-muted">
                {Math.round(exactFraction * 100)}%
              </span>
            </>
          ) : range ? (
            <>
              <ProgressBar
                mode="estimated"
                value={range[0]}
                estimatedBand={range}
                trackClassName="relative h-1.5 w-full overflow-hidden rounded-full border border-border bg-progress-unread"
              />
              <span className="shrink-0 text-[10px] font-medium text-foreground-muted">
                {formatEstimatedPercentRange(range)}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { state } = useReadingNook();

  const reading = useMemo(
    () => itemsForShelf(state.userBooks, state.catalog, "reading"),
    [state.userBooks, state.catalog],
  );

  return (
    <ThemedPageShell title="Home">
      <div className="flex flex-col gap-5">
        {/* Find friends entry point */}
        <Link
          href="/friends"
          className="flex items-center justify-between rounded-2xl border border-border bg-card-surface/95 px-4 py-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px] active:bg-accent-soft/20"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft/30 text-accent">
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none">
                <circle cx="8.5" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.75" />
                <path d="M4 19v-.5a4.5 4.5 0 0 1 9 0V19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <circle cx="16" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.75" />
                <path d="M13.5 19v-.5a3.5 3.5 0 0 1 6.5 0V19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-foreground">
              Find friends
            </span>
          </div>
          <span className="text-xs text-foreground-muted">&rsaquo;</span>
        </Link>

        {/* Continue Reading */}
        {reading.length > 0 ? (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Continue Reading
            </h2>
            <div className="flex flex-col gap-2">
              {reading.slice(0, 3).map((item) => (
                <ContinueReadingCard key={item.book.id} item={item} />
              ))}
              {reading.length > 3 ? (
                <Link
                  href="/library?shelf=reading"
                  className="text-center text-xs font-medium text-accent"
                >
                  View all {reading.length} books
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Quick actions */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Discover
          </h2>
          <Link
            href="/add"
            className="flex items-center gap-3 rounded-2xl border border-border bg-card-surface/95 px-4 py-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px] active:bg-accent-soft/20"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft/30 text-accent">
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-foreground">
              Search &amp; recommendations
            </span>
          </Link>
        </section>

        {/* Friend activity placeholder / empty state */}
        <section className="rounded-2xl border border-border bg-card-surface/95 p-5 text-center shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
          <p className="text-sm font-semibold text-foreground">
            Your feed is quiet.
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Find friends to see what they&apos;re reading, finishing, and
            ranking.
          </p>
          <Link
            href="/friends"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-semibold text-white shadow-sm active:bg-accent/80"
          >
            Find friends
          </Link>
        </section>
      </div>
    </ThemedPageShell>
  );
}
