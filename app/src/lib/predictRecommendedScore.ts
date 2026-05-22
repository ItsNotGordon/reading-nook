import { hybridAprioriKnnRecommend } from "@/lib/recommender/hybridAprioriKnn";
import { buildWeightedTasteProfile } from "@/lib/recommender/weightedTaste";
import type { RecPersonalRow } from "@/lib/recPersonalization";
import { BUCKET_RANGES, RECOMMENDATION_SCORE_FLOOR } from "@/lib/ranking";

export { RECOMMENDATION_SCORE_FLOOR };
import type { AppState, BookId, SentimentBucket } from "@/lib/types";

export type PredictedRecommendation = {
  score: number;
  predictedSentiment: SentimentBucket;
  reason: string;
};

export function sentimentFromPredictedScore(score: number): SentimentBucket {
  if (score >= BUCKET_RANGES.liked.min) return "liked";
  if (score >= BUCKET_RANGES.okay.min) return "okay";
  return "disliked";
}

export type RecommendScoreInput = {
  bookId: BookId;
  title: string;
  author: string;
  coverUrl: string;
  genres: string[];
  readinglogCount?: number;
};

/** Same 0.5–10 hybrid score as the Recommendations tab, for one title. */
export function predictRecommendedScore(
  state: AppState,
  book: RecommendScoreInput,
): PredictedRecommendation | null {
  const profile = buildWeightedTasteProfile(state);
  if (!profile.active) return null;

  const candidate: RecPersonalRow = {
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    genres: book.genres,
    score: 5,
    reason: "",
    source: "",
    readinglogCount: book.readinglogCount,
  };

  const rows = hybridAprioriKnnRecommend(state, [candidate], { maxResults: 1 });
  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    score: row.score,
    predictedSentiment: sentimentFromPredictedScore(row.score),
    reason: row.reason,
  };
}
