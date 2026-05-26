"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { BookCardVariant } from "./BookCard";
import { BookCard } from "./BookCard";
import type { SentimentBucket } from "@/lib/types";
import type { ShelfItem } from "@/lib/shelfItems";

export type { ShelfItem };

function useDragScroll(
  ref: React.RefObject<HTMLDivElement | null>,
  onDragChange?: (isDragging: boolean) => void,
) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const moved = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    dragging.current = true;
    moved.current = false;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, [ref]);

  const onDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = x - startX.current;
      if (Math.abs(walk) > 3) {
        if (!moved.current) {
          moved.current = true;
          onDragChange?.(true);
          const inner = el.querySelector("ul");
          if (inner) inner.style.pointerEvents = "none";
        }
      }
      el.scrollLeft = scrollLeft.current - walk;
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      el.style.cursor = "grab";
      el.style.removeProperty("user-select");
      const inner = el.querySelector("ul");
      if (inner) inner.style.removeProperty("pointer-events");
      if (moved.current) {
        onDragChange?.(false);
        const suppress = (e: Event) => {
          e.stopPropagation();
          e.preventDefault();
        };
        el.addEventListener("click", suppress, { capture: true, once: true });
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [ref, onDragChange]);

  return { onMouseDown, onDragStart };
}

function useScrollEdges(ref: React.RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, update]);

  return { canScrollLeft, canScrollRight, onScroll: update };
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type ShelfSectionProps = {
  title: string;
  items: ShelfItem[];
  variant: BookCardVariant;
  emptyTitle: string;
  emptyBody: string;
  /** DOM id for scroll-into-view from profile shelf snapshot links. */
  sectionId?: string;
  onStartPairwise?: (bookId: string, bucket: SentimentBucket) => void;
  onOpenRatedDetail?: (bookId: string) => void;
  onOpenDetail?: (bookId: string) => void;
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
  onOpenRatedDetail,
  onOpenDetail,
  headerMeta,
}: ShelfSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstBookId = items[0]?.userBook.bookId ?? null;
  const [isDragging, setIsDragging] = useState(false);
  const { onMouseDown, onDragStart } = useDragScroll(scrollRef, setIsDragging);
  const { canScrollLeft, canScrollRight, onScroll } = useScrollEdges(scrollRef);

  useEffect(() => {
    if (variant !== "finished") return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "smooth" });
  }, [variant, firstBookId, items.length]);

  const scrollBy = useCallback((dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  }, []);

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
        <div className="group/shelf relative">
          {/* Left arrow */}
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className={`absolute left-1 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 shadow-md backdrop-blur-sm transition-opacity duration-200 group-hover/shelf:flex h-8 w-8 ${canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <ChevronLeftIcon />
          </button>

          <div
            ref={scrollRef}
            onMouseDown={onMouseDown}
            onDragStart={onDragStart}
            onScroll={onScroll}
            data-dragging={isDragging || undefined}
            className="-mx-4 cursor-grab overflow-x-auto overflow-y-visible overscroll-x-contain px-4 pb-1 scrollbar-none"
          >
            <ul className="flex w-max min-w-full snap-x snap-mandatory gap-3 overflow-visible pb-0.5">
              {items.map(({ book, userBook }) => (
                <li key={userBook.bookId} className="snap-start overflow-visible">
                  <BookCard
                    book={book}
                    userBook={userBook}
                    variant={variant}
                    onStartPairwise={onStartPairwise}
                    onOpenRatedDetail={onOpenRatedDetail}
                    onOpenDetail={onOpenDetail}
                  />
                </li>
              ))}
            </ul>
          </div>

          {/* Right arrow */}
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className={`absolute right-1 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 shadow-md backdrop-blur-sm transition-opacity duration-200 group-hover/shelf:flex h-8 w-8 ${canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <ChevronRightIcon />
          </button>

        </div>
      )}
    </section>
  );
}
