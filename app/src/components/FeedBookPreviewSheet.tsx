"use client";

import { useMemo } from "react";
import { AddToShelfSheet } from "@/components/AddToShelfSheet";
import { useReadingNook } from "@/lib/app-state";
import { enrichBook } from "@/lib/enrichOpenLibraryBook";
import type { Book } from "@/lib/types";
import type { FeedBookInfo } from "./FeedCard";
import type { Shelf } from "@/lib/types";

type FeedBookPreviewSheetProps = {
  book: FeedBookInfo;
  onClose: () => void;
};

const EMPTY_BOOK_META: Pick<Book, "genres" | "description"> = {
  genres: [],
  description: "",
};

export function FeedBookPreviewSheet({ book, onClose }: FeedBookPreviewSheetProps) {
  const { actions, state } = useReadingNook();

  const baseBook = useMemo<Book>(() => {
    const fromCatalog = state.catalog[book.bookId];
    if (fromCatalog) return fromCatalog;
    return {
      id: book.bookId,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      totalPages: 0,
      genres: [],
      description: "",
    };
  }, [state.catalog, book.bookId, book.title, book.author, book.coverUrl]);

  const resolvedMeta = useMemo<Pick<Book, "genres" | "description">>(() => {
    if ((baseBook.genres?.length ?? 0) > 0 || baseBook.description.trim()) {
      return { genres: baseBook.genres ?? [], description: baseBook.description ?? "" };
    }
    const cached = EMPTY_BOOK_META;
    void enrichBook(baseBook).then(() => {
      // Keep this sheet purely presentational; enrich populates cache for future opens.
    });
    return cached;
  }, [baseBook]);

  const addToShelf = (shelf: Shelf, genres: string[], visibility: "public" | "private") => {
    actions.addBookToShelf(book.bookId, shelf, {
      id: book.bookId,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      genres,
      totalPages: 0,
      description: resolvedMeta.description,
    });
    actions.setUserBookVisibility(book.bookId, visibility);
    onClose();
  };

  const sheetBook: Book = {
    id: baseBook.id,
    title: baseBook.title,
    author: baseBook.author,
    coverUrl: baseBook.coverUrl,
    totalPages: baseBook.totalPages,
    genres: resolvedMeta.genres,
    description: resolvedMeta.description,
  };

  return (
    <AddToShelfSheet
      key={`feed-preview:${book.bookId}:${state.userBooks[book.bookId]?.visibility ?? "public"}:${state.userBooks[book.bookId]?.shelf ?? "none"}`}
      open
      book={sheetBook}
      onClose={onClose}
      onChooseShelf={addToShelf}
      initialVisibility={state.userBooks[book.bookId]?.visibility === "private" ? "private" : "public"}
      initialShelf={state.userBooks[book.bookId]?.shelf ?? null}
    />
  );
}
