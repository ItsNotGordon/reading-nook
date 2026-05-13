import type { BookId, SentimentBucket } from "./types";

export const BUCKET_RANGES: Record<SentimentBucket, { min: number; max: number }> = {
  liked: { min: 7.0, max: 10.0 },
  okay: { min: 3.6, max: 6.9 },
  disliked: { min: 1.0, max: 3.5 },
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Curved distribution per PRD:
 * p = 1 - rankIndex / (n - 1)
 * curve = p^0.6
 * score = bucketMin + curve * (bucketMax - bucketMin)
 */
export function scoreForRankIndex(bucket: SentimentBucket, rankIndex: number, n: number): number {
  const { min, max } = BUCKET_RANGES[bucket];
  if (n <= 1) return round1(max);
  const p = 1 - rankIndex / (n - 1);
  const curve = Math.pow(Math.max(0, Math.min(1, p)), 0.6);
  return round1(min + curve * (max - min));
}

export function computeDerivedScores(
  bucket: SentimentBucket,
  orderedBookIds: BookId[],
): Record<BookId, number> {
  const out: Record<BookId, number> = {};
  const n = orderedBookIds.length;
  for (let i = 0; i < n; i++) {
    const id = orderedBookIds[i];
    out[id] = scoreForRankIndex(bucket, i, n);
  }
  return out;
}

