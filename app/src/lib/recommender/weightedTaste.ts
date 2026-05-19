import { normalizeGenreList } from "@/lib/genreNormalize";
import type { AppState, Book, SentimentBucket, UserBook } from "@/lib/types";

/** Per-book weight in Apriori baskets (liked/okay only). */
export const BOOK_WEIGHT_LIKED = 3;
export const BOOK_WEIGHT_OKAY = 1;

/** Per genre–book contribution to signed affinity profile. */
export const GENRE_AFFINITY_LIKED = 3;
export const GENRE_AFFINITY_OKAY = 1;
export const GENRE_AFFINITY_DISLIKED = -2;

/** KNN training labels by sentiment. */
export const KNN_LABEL_LIKED = 1;
export const KNN_LABEL_OKAY = 0.5;
export const KNN_LABEL_DISLIKED = 0;

export function genreKey(raw: string): string {
  return raw.trim().toLowerCase();
}

export function authorKey(author: string): string {
  return author.trim().toLowerCase();
}

export function sentimentBookWeight(bucket: SentimentBucket): number {
  if (bucket === "liked") return BOOK_WEIGHT_LIKED;
  if (bucket === "okay") return BOOK_WEIGHT_OKAY;
  return 0;
}

export function sentimentGenreAffinity(bucket: SentimentBucket): number {
  if (bucket === "liked") return GENRE_AFFINITY_LIKED;
  if (bucket === "okay") return GENRE_AFFINITY_OKAY;
  return GENRE_AFFINITY_DISLIKED;
}

export function sentimentKnnLabel(bucket: SentimentBucket): number {
  if (bucket === "liked") return KNN_LABEL_LIKED;
  if (bucket === "okay") return KNN_LABEL_OKAY;
  return KNN_LABEL_DISLIKED;
}

export type WeightedBasket = {
  bookId: string;
  genres: string[];
  bookWeight: number;
};

export type FinishedBookRow = {
  bookId: string;
  title: string;
  author: string;
  authorKey: string;
  genres: string[];
  genreKeys: string[];
  sentiment: SentimentBucket;
  bookWeight: number;
  knnLabel: number;
};

export type WeightedTasteProfile = {
  active: boolean;
  finishedWithSentiment: number;
  genreAffinity: Map<string, number>;
  positiveBaskets: WeightedBasket[];
  finishedRows: FinishedBookRow[];
  /** Sum of book weights in positive baskets (liked + okay). */
  totalPositiveWeight: number;
};

function genresForBook(book: Book): string[] {
  return normalizeGenreList(book.genres ?? []).map(genreKey).filter(Boolean);
}

function rowFromFinished(
  book: Book,
  userBook: UserBook,
  bucket: SentimentBucket,
): FinishedBookRow {
  const genreKeys = genresForBook(book);
  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    authorKey: authorKey(book.author),
    genres: genreKeys,
    genreKeys,
    sentiment: bucket,
    bookWeight: sentimentBookWeight(bucket),
    knnLabel: sentimentKnnLabel(bucket),
  };
}

/**
 * Build weighted genre affinities and finished-book rows from app state.
 * Disliked books contribute negative affinity but are excluded from Apriori baskets.
 */
export function buildWeightedTasteProfile(state: AppState): WeightedTasteProfile {
  const genreAffinity = new Map<string, number>();
  const positiveBaskets: WeightedBasket[] = [];
  const finishedRows: FinishedBookRow[] = [];
  let finishedWithSentiment = 0;
  let totalPositiveWeight = 0;

  for (const ub of Object.values(state.userBooks)) {
    if (!ub || ub.shelf !== "finished") continue;
    const book = state.catalog[ub.bookId];
    if (!book) continue;
    const bucket = ub.sentimentBucket;
    if (bucket === null || bucket === undefined) continue;

    finishedWithSentiment += 1;
    const row = rowFromFinished(book, ub, bucket);
    finishedRows.push(row);

    const contrib = sentimentGenreAffinity(bucket);
    for (const g of row.genreKeys) {
      genreAffinity.set(g, (genreAffinity.get(g) ?? 0) + contrib);
    }

    if (bucket !== "disliked" && row.bookWeight > 0 && row.genreKeys.length > 0) {
      positiveBaskets.push({
        bookId: row.bookId,
        genres: row.genreKeys,
        bookWeight: row.bookWeight,
      });
      totalPositiveWeight += row.bookWeight;
    }
  }

  return {
    active: finishedWithSentiment > 0,
    finishedWithSentiment,
    genreAffinity,
    positiveBaskets,
    finishedRows,
    totalPositiveWeight,
  };
}

/** Top genres by signed affinity (positive only unless includeNegative). */
export function topGenresByAffinity(
  profile: WeightedTasteProfile,
  limit: number,
  includeNegative = false,
): string[] {
  const entries = [...profile.genreAffinity.entries()].filter(([, v]) =>
    includeNegative ? v !== 0 : v > 0,
  );
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return a[0].localeCompare(b[0]);
  });
  return entries.slice(0, limit).map(([g]) => g);
}
