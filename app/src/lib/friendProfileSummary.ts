import type { AppState, BookId, SentimentBucket } from "./types";
import { listFriendShelfBooks, type FriendShelfBook } from "./friendLibrary";
import { getUserTopGenreRows, topCounts } from "./userTopGenres";

const INSIGHT_BUCKETS: SentimentBucket[] = ["liked", "okay", "disliked"];

export type FriendRatingRow = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  derivedScore: number | null;
  sentimentBucket: SentimentBucket;
};

export type FriendSentimentInsight = {
  bucket: SentimentBucket;
  count: number;
  share: number;
  highlights: string[];
};

export type FriendProfileSummary = {
  totalCount: number;
  readingCount: number;
  finishedCount: number;
  wantCount: number;
  averageDerivedScore: number | null;
  topGenres: Array<{ label: string; count: number }>;
  topAuthors: Array<{ label: string; count: number }>;
  sentimentInsights: FriendSentimentInsight[];
  ratings: FriendRatingRow[];
  books: FriendShelfBook[];
};

type BookWithMeta = {
  book: AppState["catalog"][BookId];
  userBook: NonNullable<AppState["userBooks"][BookId]>;
};

function buildUserEntries(state: AppState): BookWithMeta[] {
  const out: BookWithMeta[] = [];
  for (const ub of Object.values(state.userBooks)) {
    if (!ub) continue;
    const book = state.catalog[ub.bookId];
    if (!book) continue;
    out.push({ book, userBook: ub });
  }
  return out;
}

function sentimentCount(items: BookWithMeta[], bucket: SentimentBucket): number {
  return items.filter((e) => e.userBook.sentimentBucket === bucket).length;
}

function recentTitlesForBucket(
  catalog: AppState["catalog"],
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

function buildRatings(state: AppState): FriendRatingRow[] {
  const rows: FriendRatingRow[] = [];
  for (const bucket of INSIGHT_BUCKETS) {
    for (const id of state.bucketRankings[bucket] ?? []) {
      const book = state.catalog[id];
      const ub = state.userBooks[id];
      if (!book || !ub || ub.shelf !== "finished") continue;
      if (!ub.sentimentBucket) continue;
      rows.push({
        id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        derivedScore: ub.derivedScore ?? null,
        sentimentBucket: ub.sentimentBucket,
      });
    }
  }
  return rows;
}

export function buildFriendProfileSummary(state: AppState): FriendProfileSummary {
  const userEntries = buildUserEntries(state);
  const readingCount = userEntries.filter((e) => e.userBook.shelf === "reading").length;
  const finishedEntries = userEntries.filter((e) => e.userBook.shelf === "finished");
  const finishedCount = finishedEntries.length;
  const wantCount = userEntries.filter((e) => e.userBook.shelf === "want_to_read").length;
  const totalCount = userEntries.length;

  const scoredFinished = finishedEntries.filter((e) => e.userBook.derivedScore != null);
  const averageDerivedScore =
    scoredFinished.length > 0
      ? scoredFinished.reduce((sum, e) => sum + (e.userBook.derivedScore ?? 0), 0) /
        scoredFinished.length
      : null;

  const likedCount = sentimentCount(finishedEntries, "liked");
  const okayCount = sentimentCount(finishedEntries, "okay");
  const dislikedCount = sentimentCount(finishedEntries, "disliked");
  const ratedFinishedCount = likedCount + okayCount + dislikedCount;

  const sentimentInsights = INSIGHT_BUCKETS.map((bucket) => {
    const count = sentimentCount(finishedEntries, bucket);
    const share =
      ratedFinishedCount > 0 ? Math.round((count / ratedFinishedCount) * 100) : 0;
    const highlights = recentTitlesForBucket(state.catalog, state.bucketRankings[bucket], 2);
    return { bucket, count, share, highlights };
  });

  const topGenres = getUserTopGenreRows(state, 5);
  const likedFinishedEntries = finishedEntries.filter((e) => e.userBook.sentimentBucket === "liked");
  const authorSource = likedFinishedEntries.length > 0 ? likedFinishedEntries : finishedEntries;
  const topAuthors = topCounts(
    authorSource.map((e) => e.book.author),
    3,
  );

  return {
    totalCount,
    readingCount,
    finishedCount,
    wantCount,
    averageDerivedScore,
    topGenres,
    topAuthors,
    sentimentInsights,
    ratings: buildRatings(state),
    books: listFriendShelfBooks(state),
  };
}
