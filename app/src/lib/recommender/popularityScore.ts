export const DEFAULT_POPULARITY_SCORE = 0.5;

/** Raw weight from OL reading-log / ratings counts (higher = more widely read). */
export function rawPopularityWeight(
  readinglogCount?: number,
  ratingsCount?: number,
): number {
  const rl = readinglogCount ?? 0;
  const rc = ratingsCount ?? 0;
  if (rl <= 0 && rc <= 0) return 0;
  return Math.log1p(rl) * 2 + Math.log1p(rc);
}

export type PopularityCandidate = {
  bookId: string;
  readinglogCount?: number;
  ratingsCount?: number;
};

/** Normalize popularity to [0, 1] within a candidate batch. */
export function buildPopularityScoreMap(
  candidates: readonly PopularityCandidate[],
): Map<string, number> {
  const weights = candidates.map((c) => ({
    bookId: c.bookId,
    w: rawPopularityWeight(c.readinglogCount, c.ratingsCount),
  }));
  const maxW = Math.max(...weights.map((x) => x.w), 1);
  const map = new Map<string, number>();
  for (const { bookId, w } of weights) {
    map.set(bookId, w <= 0 ? DEFAULT_POPULARITY_SCORE : w / maxW);
  }
  return map;
}

/** Bottom fraction threshold for serendipity (e.g. 0.4 = bottom 40%). */
export function popularityBottomThreshold(
  scores: readonly number[],
  bottomFraction: number,
): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * bottomFraction);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}
