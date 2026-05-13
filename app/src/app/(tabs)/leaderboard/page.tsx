"use client";

import { PageShell } from "@/components/PageShell";
import { useReadingNook } from "@/lib/app-state";
import type { BookId, SentimentBucket } from "@/lib/types";
import { sentimentLabel } from "@/lib/sentiment-display";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeaderboardPage() {
  const { state } = useReadingNook();
  const router = useRouter();
  useEffect(() => {
    router.replace("/ratings");
  }, [router]);
  const groups: Array<{ bucket: SentimentBucket; title: string }> = [
    { bucket: "liked", title: "Ratings" },
    { bucket: "okay", title: "Ratings" },
    { bucket: "disliked", title: "Ratings" },
  ];

  function rowVm(id: BookId) {
    const b = state.catalog[id];
    const ub = state.userBooks[id];
    if (!b || !ub) return null;
    return { id, title: b.title, author: b.author, score: ub.derivedScore, bucket: ub.sentimentBucket };
  }

  return (
    <PageShell title="Leaderboard">
      <div className="space-y-8">
        {groups.map(({ bucket, title }) => {
          const ids = state.bucketRankings[bucket] ?? [];
          return (
            <section key={bucket} className="space-y-3">
              <div className="flex items-end justify-between">
                <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">{title}</h2>
                <span className="text-[11px] font-medium text-foreground-muted">{ids.length}</span>
              </div>
              {ids.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-6 text-sm text-foreground-muted">
                  No books rated {sentimentLabel(bucket)} yet.
                </p>
              ) : (
                <ol className="space-y-2">
                  {ids.map((id, idx) => {
                    const vm = rowVm(id);
                    if (!vm) return null;
                    return (
                      <li
                        key={id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card-surface px-3 py-3 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground-muted">#{idx + 1}</p>
                          <p className="truncate text-sm font-semibold text-foreground">{vm.title}</p>
                          <p className="truncate text-xs text-foreground-muted">{vm.author}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums text-foreground">
                            {vm.score != null ? vm.score.toFixed(1) : "—"}
                          </p>
                          <p className="text-[10px] font-medium text-foreground-muted">{title}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
