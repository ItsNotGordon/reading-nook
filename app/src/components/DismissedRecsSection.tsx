"use client";

import { useReadingNook } from "@/lib/app-state";

export function DismissedRecsSection() {
  const { state, actions } = useReadingNook();
  const dismissedIds = state.dismissedRecIds;

  const books = dismissedIds.map((id) => {
    const cat = state.catalog[id];
    return {
      id,
      title: cat?.title ?? id,
      author: cat?.author ?? "Unknown author",
    };
  });

  return (
    <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          Dismissed recommendations
        </p>
        {books.length > 0 ? (
          <button
            type="button"
            onClick={() => actions.restoreAllDismissedRecs()}
            className="text-xs font-semibold text-accent active:text-accent/70"
          >
            Restore All
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-foreground-muted">
        Books you marked &quot;Not interested&quot; are hidden from
        recommendations. Restore them to allow them back into the pool.
      </p>

      {books.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {books.map((book) => (
            <li
              key={book.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {book.title}
                </p>
                <p className="truncate text-xs text-foreground-muted">
                  {book.author}
                </p>
              </div>
              <button
                type="button"
                onClick={() => actions.restoreDismissedRec(book.id)}
                className="shrink-0 rounded-lg border border-accent px-2.5 py-1 text-xs font-semibold text-accent active:bg-accent-soft/30"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-foreground-muted">
          No dismissed books.
        </p>
      )}
    </section>
  );
}
