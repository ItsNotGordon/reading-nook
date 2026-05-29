"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookPickerSheet } from "./BookPickerSheet";
import { createPost } from "@/lib/feedClient";
import { fetchMyClubs, type Club } from "@/lib/clubClient";
import type { Book } from "@/lib/types";

type NewPostComposerProps = {
  onPosted: () => void;
  clubId?: string;
  /** Cozy club discussion styling when posting inside a club. */
  variant?: "default" | "club";
  placeholder?: string;
  /** Pre-attach a book (e.g. current club read). */
  initialBook?: Book | null;
};

function ClubPickerSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (club: Club) => void }) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchMyClubs().then((data) => {
      setClubs(data);
      setLoading(false);
    });
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Attach to a club</h3>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-foreground-muted hover:bg-accent-soft/20"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto px-4 py-2 pb-6">
          {loading ? (
            <p className="py-6 text-center text-xs text-foreground-muted">Loading clubs...</p>
          ) : clubs.length === 0 ? (
            <p className="py-6 text-center text-xs text-foreground-muted">
              You haven&apos;t joined any clubs yet.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {clubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => {
                    onPick(club);
                    onClose();
                  }}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left active:bg-accent-soft/20"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft/30">
                    <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" stroke="currentColor" strokeWidth="1.75" />
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.75" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{club.name}</p>
                    <p className="text-[10px] text-foreground-muted">
                      {club.memberCount} member{club.memberCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewPostComposer({
  onPosted,
  clubId,
  variant = "default",
  placeholder,
  initialBook = null,
}: NewPostComposerProps) {
  const [body, setBody] = useState("");
  const [attachedBook, setAttachedBook] = useState<Book | null>(initialBook);
  const [attachedClub, setAttachedClub] = useState<Club | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clubPickerOpen, setClubPickerOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  async function handlePost() {
    const text = body.trim();
    if (!text || posting) return;
    setPosting(true);
    const ok = await createPost({
      body: text,
      bookId: attachedBook?.id,
      bookTitle: attachedBook?.title,
      bookAuthor: attachedBook?.author,
      bookCoverUrl: attachedBook?.coverUrl,
      clubId: clubId ?? attachedClub?.id,
    });
    setPosting(false);
    if (ok) {
      setBody("");
      setAttachedBook(null);
      setAttachedClub(null);
      onPosted();
    }
  }

  const resolvedPlaceholder =
    placeholder ??
    (variant === "club" || clubId
      ? "Share a thought with the club..."
      : "Share a thought about what you're reading...");

  const shellClass =
    variant === "club"
      ? "rounded-2xl border border-border/80 bg-card-surface/90 p-4 shadow-sm ring-1 ring-black/[0.04]"
      : "rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]";

  return (
    <div className={shellClass}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={resolvedPlaceholder}
        rows={variant === "club" ? 3 : 2}
        className="w-full resize-none rounded-xl border border-border/80 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/70 focus:outline-none focus:ring-1 focus:ring-accent/40"
      />

      {attachedBook ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent-soft/10 px-2.5 py-1.5">
          {attachedBook.coverUrl ? (
            <Image
              src={attachedBook.coverUrl}
              alt=""
              width={24}
              height={36}
              className="h-[36px] w-[24px] shrink-0 rounded object-cover"
              unoptimized
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{attachedBook.title}</p>
            <p className="truncate text-[10px] text-foreground-muted">{attachedBook.author}</p>
          </div>
          <button
            onClick={() => setAttachedBook(null)}
            className="shrink-0 text-xs text-foreground-muted"
          >
            &times;
          </button>
        </div>
      ) : null}

      {attachedClub && !clubId ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent-soft/10 px-2.5 py-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft/30">
            <svg className="h-3 w-3 text-accent" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" stroke="currentColor" strokeWidth="1.75" />
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.75" />
            </svg>
          </div>
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{attachedClub.name}</p>
          <button
            onClick={() => setAttachedClub(null)}
            className="shrink-0 text-xs text-foreground-muted"
          >
            &times;
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={
              variant === "club"
                ? "inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-soft/15"
                : "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-surface text-accent hover:bg-accent-soft/20"
            }
            aria-label="Attach a book"
            title="Attach a book"
          >
            <svg className="h-4 w-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" stroke="currentColor" strokeWidth="1.75" />
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.75" />
              <path d="M9 7h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            {variant === "club" ? <span>Attach book</span> : null}
          </button>
          {!clubId ? (
            <button
              onClick={() => setClubPickerOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-surface text-accent hover:bg-accent-soft/20"
              aria-label="Attach a club"
              title="Attach a club"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <rect x="3.5" y="5.5" width="5" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
                <rect x="9.5" y="4.5" width="5" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
                <rect x="15.5" y="6.5" width="5" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handlePost}
          disabled={!body.trim() || posting}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-xs font-semibold text-white shadow-sm disabled:opacity-50 active:bg-accent/80"
        >
          {posting ? "Posting..." : "Post"}
        </button>
      </div>

      <BookPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(book) => setAttachedBook(book)}
      />

      {!clubId ? (
        <ClubPickerSheet
          open={clubPickerOpen}
          onClose={() => setClubPickerOpen(false)}
          onPick={(club) => setAttachedClub(club)}
        />
      ) : null}
    </div>
  );
}
