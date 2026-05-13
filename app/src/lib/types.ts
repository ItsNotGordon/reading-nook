export type BookId = string;

/** Canonical book metadata (catalog entry). */
export type Book = {
  id: BookId;
  title: string;
  author: string;
  /** Cover image URL; may be a placeholder when missing from source data. */
  coverUrl: string;
  /** Page count when known; `0` means unknown / not set. */
  totalPages: number;
  genres: string[];
  description: string;
  /** Optional fields from Goodreads-derived catalog JSON. */
  publishedYear?: number;
  averageRating?: number;
  ratingsCount?: number;
};

/** Which shelf a copy lives on in the user library. */
export type Shelf = "want_to_read" | "reading" | "finished";

/** Post-read sentiment used for bucket rankings (not recommendations). */
export type SentimentBucket = "liked" | "okay" | "disliked";

/** How the user tracks reading progress for a title. */
export type ProgressMode = "exact" | "estimated";

/** A book the user has added to their nook, keyed by `bookId` in `AppState.userBooks`. */
export type UserBook = {
  bookId: BookId;
  shelf: Shelf;
  progressMode: ProgressMode;
  /** 1-based page when `progressMode` is `"exact"`; otherwise `null`. */
  currentPage: number | null;
  /** Inclusive 0–1 fraction bounds when `progressMode` is `"estimated"`; otherwise `null`. */
  estimatedRange: [number, number] | null;
  /** ISO timestamp when marked finished; `null` if not finished. */
  finishedAt: string | null;
  /** ISO timestamp for latest finish/rerate action used only for Finished shelf ordering. */
  finishedSortAt: string | null;
  sentimentBucket: SentimentBucket | null;
  /** Derived score within the chosen bucket (curved, bucket-bounded). */
  derivedScore: number | null;
  /** ISO timestamp when the user added this book. */
  addedAt: string;
};

/** Ordered `bookId`s per sentiment bucket for leaderboard-style ordering (no pairwise logic yet). */
export type BucketRankings = Record<SentimentBucket, BookId[]>;

export const SENTIMENT_BUCKETS: SentimentBucket[] = [
  "liked",
  "okay",
  "disliked",
];

export const SHELVES: Shelf[] = ["want_to_read", "reading", "finished"];

export type AppState = {
  version: 1;
  catalog: Record<BookId, Book>;
  /** One row per catalog book the user has shelved. */
  userBooks: Partial<Record<BookId, UserBook>>;
  bucketRankings: BucketRankings;
};
