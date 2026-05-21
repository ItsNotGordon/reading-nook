"use client";

import Link from "next/link";
import type { Shelf } from "@/lib/types";

export type ShelfBarRow = {
  shelf: Shelf;
  label: string;
  count: number;
};

type ProfileShelfBarsProps = {
  rows?: ShelfBarRow[];
  mode: "self" | "friend";
  onFriendShelfFocus?: (shelf: Shelf) => void;
};

const DEFAULT_ROWS: ShelfBarRow[] = [
  { shelf: "reading", label: "Currently Reading", count: 0 },
  { shelf: "finished", label: "Finished", count: 0 },
  { shelf: "want_to_read", label: "Want to Read", count: 0 },
];

export function profileShelfBarRows(counts: {
  reading: number;
  finished: number;
  wantToRead: number;
}): ShelfBarRow[] {
  return [
    { shelf: "reading", label: "Currently Reading", count: counts.reading },
    { shelf: "finished", label: "Finished", count: counts.finished },
    { shelf: "want_to_read", label: "Want to Read", count: counts.wantToRead },
  ];
}

const rowClassName =
  "block w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-accent-soft/20 active:bg-accent-soft/40";

export function ProfileShelfBars({
  rows = DEFAULT_ROWS,
  mode,
  onFriendShelfFocus,
}: ProfileShelfBarsProps) {
  return (
    <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        Library
      </p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => {
          const inner = (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{row.label}</span>
              <span className="text-sm font-semibold tabular-nums text-foreground-muted">
                {row.count}
              </span>
            </div>
          );

          if (mode === "self") {
            const href =
              row.shelf === "finished" ? "/ratings" : `/library?shelf=${row.shelf}`;
            return (
              <li key={row.shelf}>
                <Link href={href} className={rowClassName}>
                  {inner}
                </Link>
              </li>
            );
          }

          return (
            <li key={row.shelf}>
              <button
                type="button"
                onClick={() => onFriendShelfFocus?.(row.shelf)}
                className={`${rowClassName} text-left`}
              >
                {inner}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
