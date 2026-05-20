"use client";

import { CoverThumb } from "@/components/CoverThumb";
import { groupFriendShelfBooks } from "@/lib/friendLibrary";
import type { FriendProfileSummary } from "@/lib/friendProfileSummary";
import {
  sentimentInsightSurface,
  sentimentLabel,
  sentimentTextColor,
} from "@/lib/sentiment-display";
import type { SentimentBucket } from "@/lib/types";

const SHELF_LABELS: Record<string, string> = {
  reading: "Currently reading",
  finished: "Finished",
  want_to_read: "Want to read",
};

const RATING_BUCKET_ORDER: SentimentBucket[] = ["liked", "okay", "disliked"];

function scoreColor(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#426447]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

type FriendProfileInsightsProps = {
  summary: FriendProfileSummary;
};

export function FriendProfileInsights({ summary }: FriendProfileInsightsProps) {
  const grouped = groupFriendShelfBooks(summary.books);
  const ratingsByBucket = RATING_BUCKET_ORDER.map((bucket) => ({
    bucket,
    rows: summary.ratings.filter((r) => r.sentimentBucket === bucket),
  }));
  const hasRatings = summary.ratings.length > 0;
  const libraryShelves = (["reading", "finished", "want_to_read"] as const).filter(
    (shelf) => shelf !== "finished" || !hasRatings,
  );
  const hasLibraryContent = libraryShelves.some((shelf) => grouped[shelf].length > 0);

  if (summary.totalCount === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-card-surface/50 px-4 py-6 text-center text-sm text-foreground-muted">
        No books on their shelves yet.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-border/80 bg-background px-3 py-3 text-center">
            <p className="text-2xl font-semibold text-[#426447]">{summary.totalCount}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground-muted">Total books</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background px-3 py-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{summary.readingCount}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground-muted">Reading</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background px-3 py-3 text-center">
            <p className="text-2xl font-semibold text-foreground">{summary.finishedCount}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground-muted">Finished</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background px-3 py-3 text-center">
            <p className="text-2xl font-semibold text-[#a27f00]">
              {summary.averageDerivedScore == null ? "—" : summary.averageDerivedScore.toFixed(1)}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground-muted">Avg score</p>
          </div>
        </div>
      </section>

      {summary.topGenres.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Top genres</p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {summary.topGenres.map((g, idx) => (
              <li
                key={g.label}
                className="rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground"
              >
                <p className="text-[10px] uppercase tracking-wider text-foreground-muted">
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <p className="mt-0.5 line-clamp-1 font-medium">{g.label}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary.topAuthors.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Favorite authors</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {summary.topAuthors.map((a) => (
              <li key={a.label}>
                <span className="inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
                  {a.label} <span className="text-foreground-muted">({a.count})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary.sentimentInsights.some((s) => s.count > 0) ? (
        <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Recent insights</p>
          <div className="mt-3 space-y-2">
            {summary.sentimentInsights.map(({ bucket, count, share, highlights }) =>
              count > 0 ? (
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
                      <span className="ml-1 text-xs font-medium opacity-80">({share}%)</span>
                    </p>
                  </div>
                  {highlights.length > 0 ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-foreground-muted">
                      Top picks:{" "}
                      <span className="text-foreground">{highlights.join(" · ")}</span>
                    </p>
                  ) : null}
                </div>
              ) : null,
            )}
          </div>
        </section>
      ) : null}

      {hasRatings ? (
        <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Ratings</p>
          <div className="mt-3 space-y-4">
            {ratingsByBucket.map(({ bucket, rows }) =>
              rows.length > 0 ? (
                <div key={bucket}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${sentimentTextColor(bucket)}`}>
                    {sentimentLabel(bucket)}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {rows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center gap-3 rounded-xl border border-border/80 bg-background p-2.5"
                      >
                        <CoverThumb
                          src={row.coverUrl}
                          alt=""
                          sizes="40px"
                          fallbackLetter={row.title}
                          className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-border"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                          <p className="truncate text-xs text-foreground-muted">{row.author}</p>
                        </div>
                        {row.derivedScore != null ? (
                          <p className={`shrink-0 text-sm font-semibold tabular-nums ${scoreColor(bucket)}`}>
                            {row.derivedScore.toFixed(1)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
        </section>
      ) : null}

      {hasLibraryContent ? (
        <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Library</p>
          <div className="mt-3 space-y-4">
            {libraryShelves.map((shelf) => {
              const items = grouped[shelf];
              if (items.length === 0) return null;
              return (
                <div key={shelf}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                    {SHELF_LABELS[shelf]}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {items.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center gap-3 rounded-xl border border-border/80 bg-background px-3 py-2"
                      >
                        <CoverThumb
                          src={b.coverUrl}
                          alt=""
                          sizes="40px"
                          fallbackLetter={b.title}
                          className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-border"
                        />
                        <p className="min-w-0 text-sm font-medium text-foreground">{b.title}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}