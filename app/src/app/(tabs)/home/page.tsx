"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { HomeFeed } from "@/components/HomeFeed";
import { NotificationBadge } from "@/components/NotificationBadge";
import { useNotificationCounts } from "@/components/NotificationCountsProvider";
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
  const { friends: friendBadgeCount, clubs: clubBadgeCount } = useNotificationCounts();

  const reading = useMemo(
    () => itemsForShelf(state.userBooks, state.catalog, "reading"),
    [state.userBooks, state.catalog],
  );

  return (
    <ThemedPageShell title="Home">
      <div className="flex flex-col gap-5">
        {/* Friends + Clubs buttons */}
        <div className="flex gap-3">
          <Link
            href="/friends"
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card-surface/95 px-4 py-3 shadow-sm ring-1 backdrop-blur-[1px] active:bg-accent-soft/20 ${
              friendBadgeCount > 0 ? "ring-accent/40 ring-2" : "ring-black/[0.03]"
            }`}
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft/30 text-accent">
              <NotificationBadge count={friendBadgeCount} />
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle cx="8.5" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.75" />
                <path d="M4 19v-.5a4.5 4.5 0 0 1 9 0V19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <circle cx="16" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.75" />
                <path d="M13.5 19v-.5a3.5 3.5 0 0 1 6.5 0V19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-foreground">Friends</span>
          </Link>

          <Link
            href="/clubs"
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card-surface/95 px-4 py-3 shadow-sm ring-1 backdrop-blur-[1px] active:bg-accent-soft/20 ${
              clubBadgeCount > 0 ? "ring-accent/40 ring-2" : "ring-black/[0.03]"
            }`}
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft/30 text-accent">
              <NotificationBadge count={clubBadgeCount} />
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" stroke="currentColor" strokeWidth="1.75" />
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.75" />
                <path d="M9 7h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-foreground">Clubs</span>
          </Link>
        </div>

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

        {/* Social feed */}
        <HomeFeed />
      </div>
    </ThemedPageShell>
  );
}
