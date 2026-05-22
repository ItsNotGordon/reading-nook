import type { FriendRatingRow } from "./friendProfileSummary";
import type { FriendShelfBook } from "./friendLibrary";
import type { SharedRatedBook } from "./tasteComparison";
import type { AppState, BookId, SentimentBucket, Shelf } from "./types";

export type FriendBookSnapshot = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  genres: string[];
  readinglogCount?: number;
  shelf: Shelf;
  finishedAt: string | null;
  notes: string;
  derivedScore: number | null;
  sentimentBucket: SentimentBucket | null;
  progressMode?: FriendShelfBook["progressMode"];
  currentPage?: number | null;
  estimatedRange?: [number, number] | null;
  totalPages?: number;
};

export function friendBookFromRating(row: FriendRatingRow): FriendBookSnapshot {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverUrl: row.coverUrl,
    genres: row.genres,
    readinglogCount: row.readinglogCount,
    shelf: "finished",
    finishedAt: row.finishedAt,
    notes: row.notes,
    derivedScore: row.derivedScore,
    sentimentBucket: row.sentimentBucket,
  };
}

/** Minimal snapshot when opening compare from taste overlap (finished ratings only). */
export function friendBookFromSharedRated(row: SharedRatedBook): FriendBookSnapshot {
  return {
    id: row.bookId,
    title: row.title,
    author: row.author,
    coverUrl: row.coverUrl,
    genres: [],
    shelf: "finished",
    finishedAt: null,
    notes: "",
    derivedScore: row.friendScore,
    sentimentBucket: row.friendSentiment,
  };
}

export function friendBookFromShelf(row: FriendShelfBook): FriendBookSnapshot {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverUrl: row.coverUrl,
    genres: row.genres,
    readinglogCount: row.readinglogCount,
    shelf: row.shelf,
    finishedAt: row.finishedAt,
    notes: row.notes,
    derivedScore: null,
    sentimentBucket: null,
    progressMode: row.progressMode,
    currentPage: row.currentPage,
    estimatedRange: row.estimatedRange,
    totalPages: row.totalPages,
  };
}

export function findFriendBookSnapshot(
  bookId: BookId,
  ratings: FriendRatingRow[],
  books: FriendShelfBook[],
): FriendBookSnapshot | null {
  const rated = ratings.find((r) => r.id === bookId);
  if (rated) return friendBookFromRating(rated);
  const shelved = books.find((b) => b.id === bookId);
  if (shelved) return friendBookFromShelf(shelved);
  return null;
}

export function yourBookSnapshot(state: AppState, bookId: BookId): FriendBookSnapshot | null {
  const ub = state.userBooks[bookId];
  const book = state.catalog[bookId];
  if (!ub || !book) return null;
  return {
    id: bookId,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    genres: book.genres ?? [],
    readinglogCount: book.readinglogCount,
    shelf: ub.shelf,
    finishedAt: ub.finishedAt,
    notes: ub.notes ?? "",
    derivedScore: ub.derivedScore ?? null,
    sentimentBucket: ub.sentimentBucket,
    progressMode: ub.progressMode,
    currentPage: ub.currentPage,
    estimatedRange: ub.estimatedRange,
    totalPages: book.totalPages,
  };
}
