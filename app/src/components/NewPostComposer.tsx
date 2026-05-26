"use client";

import { useState } from "react";
import Image from "next/image";
import { BookPickerSheet } from "./BookPickerSheet";
import { createPost } from "@/lib/feedClient";
import type { Book } from "@/lib/types";

type NewPostComposerProps = {
  onPosted: () => void;
};

export function NewPostComposer({ onPosted }: NewPostComposerProps) {
  const [body, setBody] = useState("");
  const [attachedBook, setAttachedBook] = useState<Book | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
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
    });
    setPosting(false);
    if (ok) {
      setBody("");
      setAttachedBook(null);
      onPosted();
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share a thought about what you're reading..."
        rows={2}
        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
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

      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={() => setPickerOpen(true)}
          className="text-xs font-medium text-accent"
        >
          Attach a book
        </button>
        <button
          onClick={handlePost}
          disabled={!body.trim() || posting}
          className="inline-flex h-8 items-center justify-center rounded-xl border border-accent bg-accent px-4 text-xs font-semibold text-white shadow-sm disabled:opacity-50 active:bg-accent/80"
        >
          {posting ? "Posting..." : "Post"}
        </button>
      </div>

      <BookPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(book) => setAttachedBook(book)}
      />
    </div>
  );
}
