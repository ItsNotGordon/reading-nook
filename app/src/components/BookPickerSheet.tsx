"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useReadingNook } from "@/lib/app-state";
import { itemsForShelf } from "@/lib/shelfItems";
import type { Book, Shelf } from "@/lib/types";

type BookPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  onPick: (book: Book) => void;
};

const SHELF_LABELS: Record<Shelf, string> = {
  want_to_read: "Want to Read",
  reading: "Currently Reading",
  finished: "Finished",
};

export function BookPickerSheet({ open, onClose, onPick }: BookPickerSheetProps) {
  const { state } = useReadingNook();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const shelves: Shelf[] = ["reading", "want_to_read", "finished"];
    return shelves.map((shelf) => ({
      shelf,
      label: SHELF_LABELS[shelf],
      items: itemsForShelf(state.userBooks, state.catalog, shelf),
    }));
  }, [state.userBooks, state.catalog]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.book.title.toLowerCase().includes(q) ||
            i.book.author.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Attach a book</h3>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-foreground-muted hover:bg-accent-soft/20"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="px-4 py-2">
          <input
            type="text"
            placeholder="Search your shelves..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto px-4 pb-6">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-xs text-foreground-muted">
              No books found.
            </p>
          ) : (
            filtered.map((g) => (
              <div key={g.shelf} className="mb-3">
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                  {g.label}
                </h4>
                <div className="flex flex-col gap-1">
                  {g.items.map((item) => (
                    <button
                      key={item.book.id}
                      onClick={() => {
                        onPick(item.book);
                        onClose();
                      }}
                      className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left active:bg-accent-soft/20"
                    >
                      {item.book.coverUrl ? (
                        <Image
                          src={item.book.coverUrl}
                          alt=""
                          width={28}
                          height={42}
                          className="h-[42px] w-[28px] shrink-0 rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-[42px] w-[28px] shrink-0 items-center justify-center rounded bg-accent-soft/30 text-[8px] text-foreground-muted">
                          Book
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.book.title}
                        </p>
                        <p className="truncate text-xs text-foreground-muted">
                          {item.book.author}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
