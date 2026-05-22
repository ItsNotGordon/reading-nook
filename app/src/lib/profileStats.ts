import type { AppState, Book, BookId, SentimentBucket, Shelf, UserBook } from "./types";
import { getUserTopGenreRows, topCounts } from "./userTopGenres";

export const INSIGHT_BUCKETS: SentimentBucket[] = ["liked", "okay", "disliked"];

export type BookWithMeta = { book: Book; userBook: UserBook };

export type ShelfCounts = {
  reading: number;
  finished: number;
  wantToRead: number;
  total: number;
};

export type SentimentInsightRow = {
  bucket: SentimentBucket;
  count: number;
  share: number;
  highlights: string[];
};

export type FavoriteBookVm = {
  bookId: BookId;
  title: string;
  author: string;
  coverUrl: string;
} | null;

export function buildUserEntries(state: AppState): BookWithMeta[] {
  const out: BookWithMeta[] = [];
  for (const ub of Object.values(state.userBooks)) {
    if (!ub) continue;
    const book = state.catalog[ub.bookId];
    if (!book) continue;
    out.push({ book, userBook: ub });
  }
  return out;
}

export function getShelfCounts(state: AppState): ShelfCounts {
  const entries = buildUserEntries(state);
  const reading = entries.filter((e) => e.userBook.shelf === "reading").length;
  const finished = entries.filter((e) => e.userBook.shelf === "finished").length;
  const wantToRead = entries.filter((e) => e.userBook.shelf === "want_to_read").length;
  return { reading, finished, wantToRead, total: entries.length };
}

export function shelfHref(shelf: Shelf): string {
  if (shelf === "finished") return "/ratings";
  return `/library?shelf=${shelf}`;
}

export function sentimentCount(items: BookWithMeta[], bucket: SentimentBucket): number {
  return items.filter((e) => e.userBook.sentimentBucket === bucket).length;
}

function recentTitlesForBucket(
  catalog: Record<BookId, Book>,
  orderedIds: readonly BookId[],
  maxTitles: number,
): string[] {
  const out: string[] = [];
  for (const id of orderedIds) {
    if (out.length >= maxTitles) break;
    const title = catalog[id]?.title?.trim();
    if (title) out.push(title);
  }
  return out;
}

export function buildSentimentInsights(state: AppState): SentimentInsightRow[] {
  const finishedEntries = buildUserEntries(state).filter((e) => e.userBook.shelf === "finished");
  const likedCount = sentimentCount(finishedEntries, "liked");
  const okayCount = sentimentCount(finishedEntries, "okay");
  const dislikedCount = sentimentCount(finishedEntries, "disliked");
  const ratedFinishedCount = likedCount + okayCount + dislikedCount;

  return INSIGHT_BUCKETS.map((bucket) => {
    const count = sentimentCount(finishedEntries, bucket);
    const share =
      ratedFinishedCount > 0 ? Math.round((count / ratedFinishedCount) * 100) : 0;
    const highlights = recentTitlesForBucket(state.catalog, state.bucketRankings[bucket], 2);
    return { bucket, count, share, highlights };
  });
}

export function getFavoriteBook(state: AppState): FavoriteBookVm {
  const bookId =
    state.bucketRankings.liked[0] ??
    state.bucketRankings.okay[0] ??
    state.bucketRankings.disliked[0] ??
    null;
  if (!bookId) return null;
  const book = state.catalog[bookId];
  if (!book) return null;
  return {
    bookId,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
  };
}

export function getFavoriteGenres(state: AppState, limit = 5) {
  return getUserTopGenreRows(state, limit);
}

export function getFavoriteAuthors(state: AppState, limit = 3) {
  const finishedEntries = buildUserEntries(state).filter((e) => e.userBook.shelf === "finished");
  const likedFinished = finishedEntries.filter((e) => e.userBook.sentimentBucket === "liked");
  const authorSource = likedFinished.length > 0 ? likedFinished : finishedEntries;
  return topCounts(
    authorSource.map((e) => e.book.author),
    limit,
  );
}

export function ratedFinishedCount(state: AppState): number {
  const finishedEntries = buildUserEntries(state).filter((e) => e.userBook.shelf === "finished");
  return (
    sentimentCount(finishedEntries, "liked") +
    sentimentCount(finishedEntries, "okay") +
    sentimentCount(finishedEntries, "disliked")
  );
}
