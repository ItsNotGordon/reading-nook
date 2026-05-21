import type { AppState, SentimentBucket } from "./types";
import { listFriendShelfBooks, type FriendShelfBook } from "./friendLibrary";
import {
  buildSentimentInsights,
  getFavoriteAuthors,
  getFavoriteBook,
  getFavoriteGenres,
  getShelfCounts,
  INSIGHT_BUCKETS,
} from "./profileStats";

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
  favoriteBook: ReturnType<typeof getFavoriteBook>;
  topGenres: Array<{ label: string; count: number }>;
  topAuthors: Array<{ label: string; count: number }>;
  sentimentInsights: FriendSentimentInsight[];
  ratings: FriendRatingRow[];
  books: FriendShelfBook[];
};

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
  const shelves = getShelfCounts(state);
  const finishedEntries = Object.values(state.userBooks).filter(
    (ub) => ub && ub.shelf === "finished",
  );
  const scoredFinished = finishedEntries.filter((ub) => ub && ub.derivedScore != null);
  const averageDerivedScore =
    scoredFinished.length > 0
      ? scoredFinished.reduce((sum, ub) => sum + (ub!.derivedScore ?? 0), 0) / scoredFinished.length
      : null;

  return {
    totalCount: shelves.total,
    readingCount: shelves.reading,
    finishedCount: shelves.finished,
    wantCount: shelves.wantToRead,
    averageDerivedScore,
    favoriteBook: getFavoriteBook(state),
    topGenres: getFavoriteGenres(state, 5),
    topAuthors: getFavoriteAuthors(state, 3),
    sentimentInsights: buildSentimentInsights(state),
    ratings: buildRatings(state),
    books: listFriendShelfBooks(state),
  };
}
