"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Book, UserBook } from "@/lib/types";
import type { BookCardVariant } from "./BookCard";
import { BookCard } from "./BookCard";
import type { SentimentBucket } from "@/lib/types";

export type ShelfItem = { book: Book; userBook: UserBook };

type ShelfSectionProps = {
  title: string;
  items: ShelfItem[];
  variant: BookCardVariant;
  emptyTitle: string;
  emptyBody: string;
  /** DOM id for scroll-into-view from profile shelf snapshot links. */
  sectionId?: string;
  onStartPairwise?: (bookId: string, bucket: SentimentBucket) => void;
  headerMeta?: ReactNode;
};

export function ShelfSection({
  title,
  items,
  variant,
  emptyTitle,
  emptyBody,
  sectionId,
  onStartPairwise,
  headerMeta,
}: ShelfSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstBookId = items[0]?.userBook.bookId ?? null;

  useEffect(() => {
    if (variant !== "finished") return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "smooth" });
  }, [variant, firstBookId, items.length]);

  return (
    <section id={sectionId} className="scroll-mt-24 space-y-3">
      <div className="flex items-end justify-between gap-2 pr-0.5">
        <h2 className="font-serif text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {headerMeta ? (
          headerMeta
        ) : items.length > 0 ? (
          <span className="text-[11px] font-medium text-foreground-muted">{items.length}</span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-6 text-center shadow-inner">
          <p className="font-medium text-foreground">{emptyTitle}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">{emptyBody}</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:thin]"
        >
          <ul className="flex w-max min-w-full snap-x snap-mandatory gap-3 pb-0.5">
            {items.map(({ book, userBook }) => (
              <li key={userBook.bookId} className="snap-start">
                <BookCard
                  book={book}
                  userBook={userBook}
                  variant={variant}
                  onStartPairwise={onStartPairwise}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
