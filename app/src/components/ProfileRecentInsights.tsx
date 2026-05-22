"use client";

import Link from "next/link";
import {
  sentimentInsightSurface,
  sentimentLabel,
  sentimentTextColor,
} from "@/lib/sentiment-display";
import type { SentimentInsightRow } from "@/lib/profileStats";

type ProfileRecentInsightsProps = {
  insights: SentimentInsightRow[];
  ratedFinishedCount: number;
  mode: "self" | "friend";
};

export function ProfileRecentInsights({
  insights,
  ratedFinishedCount,
  mode,
}: ProfileRecentInsightsProps) {
  return (
    <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <p className="text-sm font-semibold text-foreground">Recent insights</p>
      {ratedFinishedCount > 0 ? (
        <p className="mt-1 text-xs text-foreground-muted">
          From {ratedFinishedCount} finished book{ratedFinishedCount === 1 ? "" : "s"} you&apos;ve
          rated
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {insights.map(({ bucket, count, share, highlights }) => {
          const body = (
            <>
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
            </>
          );

          const className = `block rounded-xl border px-3 py-2.5 ${sentimentInsightSurface(bucket)} ${
            mode === "self"
              ? "transition-colors hover:bg-accent-soft/25 active:bg-accent-soft/40"
              : ""
          }`;

          if (mode === "self") {
            return (
              <Link
                key={bucket}
                href={`/ratings?bucket=${bucket}`}
                aria-label={`View ${sentimentLabel(bucket)} books in Ratings`}
                className={className}
              >
                {body}
              </Link>
            );
          }

          return (
            <div key={bucket} className={className}>
              {body}
            </div>
          );
        })}
      </div>
      {ratedFinishedCount === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
          Taste insights will appear after you finish and rank a few books.
        </p>
      ) : null}
    </section>
  );
}
