"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { RatedBookDetailSheet } from "@/components/RatedBookDetailSheet";
import { PageShell } from "@/components/PageShell";
import { useReadingNook } from "@/lib/app-state";
import type { BookId, SentimentBucket } from "@/lib/types";

const BUCKET_ORDER: SentimentBucket[] = ["liked", "okay", "disliked"];

function scoreColor(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#426447]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

export default function RatingsPage() {
  const { state } = useReadingNook();
  const [detailBookId, setDetailBookId] = useState<BookId | null>(null);

  const openDetailBookId = useMemo(() => {
    if (!detailBookId) return null;
    if (!state.catalog[detailBookId] || !state.userBooks[detailBookId]) return null;
    return detailBookId;
  }, [detailBookId, state.catalog, state.userBooks]);

  const mergedRows = useMemo(() => {
    type Row = {
      id: BookId;
      title: string;
      author: string;
      coverUrl: string;
      score: number | null;
      bucket: SentimentBucket;
    };
    const rows: Row[] = [];
    for (const bucket of BUCKET_ORDER) {
      const ids = state.bucketRankings[bucket] ?? [];
      for (const id of ids) {
        const b = state.catalog[id];
        const ub = state.userBooks[id];
        if (!b || !ub) continue;
        const sentiment = ub.sentimentBucket ?? bucket;
        rows.push({
          id,
          title: b.title,
          author: b.author,
          coverUrl: b.coverUrl,
          score: ub.derivedScore,
          bucket: sentiment,
        });
      }
    }
    rows.sort((a, b) => {
      if (a.score == null && b.score == null) return a.id.localeCompare(b.id);
      if (a.score == null) return 1;
      if (b.score == null) return -1;
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });
    return rows;
  }, [state.bucketRankings, state.catalog, state.userBooks]);

  return (
    <PageShell title="Ratings">
      {openDetailBookId ? (
        <RatedBookDetailSheet bookId={openDetailBookId} onClose={() => setDetailBookId(null)} />
      ) : null}
      {mergedRows.length === 0 ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center">
          <p className="text-sm leading-relaxed text-foreground-muted">
            No rated books yet. Finish a book and pick how you felt about it to build your list.
          </p>
          <Link
            href="/add"
            className="inline-flex min-h-11 min-w-[8.5rem] items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
          >
            Go to Add
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-end justify-between px-0.5">
            <p className="text-xs font-medium text-foreground-muted">
              {mergedRows.length} title{mergedRows.length === 1 ? "" : "s"}, highest to lowest
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card-surface shadow-sm ring-1 ring-black/[0.03]">
            <ol>
              {mergedRows.map((vm, idx) => (
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
    </PageShell>
  );
}
