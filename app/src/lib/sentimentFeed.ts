import type { AppState, BookId } from "./types";
import { bookHasBucketRanking } from "./libraryRankings";
import type { PostFeedEventInput } from "./feedClient";

/** True when sentiment bucket or derived score changed for this book. */
export function sentimentRatingChanged(
  before: AppState,
  after: AppState,
  bookId: BookId,
): boolean {
  const prev = before.userBooks[bookId];
  const next = after.userBooks[bookId];
  if (!prev || !next) return false;
  if (prev.sentimentBucket !== next.sentimentBucket) return true;
  if (prev.derivedScore !== next.derivedScore) return true;
  return false;
}

export function buildSentimentUpdateFeedEvent(
  state: AppState,
  bookId: BookId,
): PostFeedEventInput | null {
  const cat = state.catalog[bookId];
  const ub = state.userBooks[bookId];
  if (!cat || !ub?.sentimentBucket) return null;
  return {
    eventType: "sentiment_update",
    bookId,
    bookTitle: cat.title,
    bookAuthor: cat.author,
    bookCoverUrl: cat.coverUrl,
    shelf: "finished",
    sentiment: ub.sentimentBucket,
    derivedScore: ub.derivedScore ?? undefined,
  };
}

export function shouldPostInitialFinishedFeed(
  before: AppState,
  bookId: BookId,
): boolean {
  return !bookHasBucketRanking(before, bookId);
}
