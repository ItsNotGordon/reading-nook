"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [bookMeta, setBookMeta] = useState<Pick<Book, "genres" | "description">>(() => ({
    genres: state.catalog[book.bookId]?.genres ?? [],
    description: state.catalog[book.bookId]?.description ?? "",
  }));

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
    if ((bookMeta.genres?.length ?? 0) > 0 || bookMeta.description.trim()) {
      return bookMeta;
    }
    if ((baseBook.genres?.length ?? 0) > 0 || baseBook.description.trim()) {
      return { genres: baseBook.genres ?? [], description: baseBook.description ?? "" };
    }
    return EMPTY_BOOK_META;
  }, [bookMeta, baseBook]);

  useEffect(() => {
    let active = true;
    const baseMeta = {
      genres: baseBook.genres ?? [],
      description: baseBook.description ?? "",
    };
    queueMicrotask(() => {
      if (!active) return;
      setBookMeta(baseMeta);
    });
    void enrichBook(baseBook).then((enriched) => {
      if (!active) return;
      const nextGenres = enriched.genres ?? [];
      const nextDescription = enriched.description ?? "";
      if (nextGenres.length === 0 && !nextDescription.trim() && (baseMeta.genres.length > 0 || baseMeta.description.trim())) {
        return;
      }
      setBookMeta({
        genres: nextGenres.length > 0 ? nextGenres : baseMeta.genres,
        description: nextDescription.trim() ? nextDescription : baseMeta.description,
      });
    });
    return () => {
      active = false;
    };
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
