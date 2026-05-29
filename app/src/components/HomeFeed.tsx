"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchFeed, type FeedItem } from "@/lib/feedClient";
import { useReadingNook } from "@/lib/app-state";
import { FeedCard, type FeedBookInfo } from "./FeedCard";
import { NewPostComposer } from "./NewPostComposer";
import { BookDetailSheet } from "./BookDetailSheet";
import { FeedBookPreviewSheet } from "./FeedBookPreviewSheet";
import type { BookId, SentimentBucket } from "@/lib/types";
import { PairwiseComparisonSheet } from "./PairwiseComparisonSheet";

export function HomeFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);
  const mountedRef = useRef(true);
  const { state } = useReadingNook();

  const [detailBookId, setDetailBookId] = useState<BookId | null>(null);
  const [previewBook, setPreviewBook] = useState<FeedBookInfo | null>(null);
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: BookId | null;
    bucket: SentimentBucket | null;
    shareToFeed?: boolean;
  }>({ open: false, bookId: null, bucket: null });

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    fetchFeed().then((resp) => {
      if (cancelled || !mountedRef.current) return;
      setItems(resp.items);
      setCurrentUserId(resp.currentUserId);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [trigger]);

  const reload = useCallback(() => {
    setTrigger((n) => n + 1);
  }, []);

  const handleBookClick = useCallback(
    (book: FeedBookInfo) => {
      if (state.catalog[book.bookId] && state.userBooks[book.bookId]) {
        setDetailBookId(book.bookId);
      } else {
        setPreviewBook(book);
      }
    },
    [state.catalog, state.userBooks],
  );

  return (
    <section className="flex flex-col gap-3">
      <NewPostComposer onPosted={reload} />

      {loading && items.length === 0 ? (
        <div className="py-6 text-center text-xs text-foreground-muted">
          Loading feed...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card-surface/95 p-5 text-center shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
          <p className="text-sm font-semibold text-foreground">
            Your feed is quiet.
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Find friends to see what they&apos;re reading, finishing, and
            ranking.
          </p>
          <Link
            href="/friends"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-semibold text-white shadow-sm active:bg-accent/80"
          >
            Find friends
          </Link>
        </div>
      ) : (
        items.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            currentUserId={currentUserId}
            onRefresh={reload}
            onBookClick={handleBookClick}
          />
        ))
      )}

      {detailBookId && state.catalog[detailBookId] && state.userBooks[detailBookId] ? (
        <BookDetailSheet
          bookId={detailBookId}
          onClose={() => setDetailBookId(null)}
          onStartPairwise={(bookId, bucket, options) => {
            setDetailBookId(null);
            setPairwise({
              open: true,
              bookId,
              bucket,
              shareToFeed: options?.shareToFeed,
            });
          }}
        />
      ) : null}

      {previewBook ? (
        <FeedBookPreviewSheet
          book={previewBook}
          onClose={() => setPreviewBook(null)}
        />
      ) : null}

      {pairwise.open && pairwise.bookId && pairwise.bucket ? (
        <PairwiseComparisonSheet
          newBookId={pairwise.bookId}
          bucket={pairwise.bucket}
          shareToFeed={pairwise.shareToFeed}
          onDone={() => setPairwise({ open: false, bookId: null, bucket: null })}
        />
      ) : null}
    </section>
  );
}
