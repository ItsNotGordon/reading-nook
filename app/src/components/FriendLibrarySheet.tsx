"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CoverThumb } from "@/components/CoverThumb";
import { groupFriendShelfBooks, type FriendShelfBook } from "@/lib/friendLibrary";

type FriendLibrarySheetProps = {
  friendId: string;
  friendName: string;
  onClose: () => void;
};

const SHELF_LABELS: Record<string, string> = {
  reading: "Currently reading",
  finished: "Finished",
  want_to_read: "Want to read",
};

export function FriendLibrarySheet({ friendId, friendName, onClose }: FriendLibrarySheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<FriendShelfBook[]>([]);
  const [shareShelves, setShareShelves] = useState(true);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/friends/${friendId}/library`);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        shareShelves?: boolean;
        books?: FriendShelfBook[];
      };
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Could not load shelves.");
        setLoading(false);
        return;
      }
      setShareShelves(Boolean(data.shareShelves));
      setBooks(data.books ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [friendId]);

  const grouped = groupFriendShelfBooks(books);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[115] m-0 max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/35 [&::backdrop]:bg-black/35"
      aria-labelledby={headingId}
      onClose={() => onClose()}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 cursor-default border-0 bg-black/35 p-0"
          aria-label="Dismiss"
          tabIndex={-1}
          onClick={() => onClose()}
        />
        <div className="relative z-10 flex max-h-[min(88vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl sm:rounded-2xl">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <p id={headingId} className="font-serif text-lg font-semibold text-foreground">
              {friendName}&apos;s shelves
            </p>
            <p className="mt-1 text-xs text-foreground-muted">Read-only · shared with you</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <p className="text-sm text-foreground-muted">Loading…</p>
            ) : error ? (
              <p className="text-sm text-red-700">{error}</p>
            ) : !shareShelves ? (
              <p className="text-sm text-foreground-muted">
                {friendName} has not enabled shelf sharing.
              </p>
            ) : books.length === 0 ? (
              <p className="text-sm text-foreground-muted">No shelved books yet.</p>
            ) : (
              <div className="space-y-4">
                {(["reading", "finished", "want_to_read"] as const).map((shelf) => {
                  const items = grouped[shelf];
                  if (items.length === 0) return null;
                  return (
                    <section key={shelf}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        {SHELF_LABELS[shelf]}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {items.map((b) => (
                          <li
                            key={b.id}
                            className="flex items-center gap-3 rounded-xl border border-border/80 bg-card-surface px-3 py-2"
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
                    </section>
                  );
                })}
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => onClose()}
              className="min-h-10 w-full rounded-xl border border-border bg-background text-sm font-semibold text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
