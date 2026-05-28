import type { AppState, BookId, BucketRankings } from "./types";
import { SENTIMENT_BUCKETS } from "./types";
import { computeDerivedScores } from "./ranking";

function emptyRankings(): BucketRankings {
  return { liked: [], okay: [], disliked: [] };
}

/** True when the book already appears in any sentiment bucket ranking. */
export function bookHasBucketRanking(state: AppState, bookId: BookId): boolean {
  return SENTIMENT_BUCKETS.some((bucket) => state.bucketRankings[bucket]?.includes(bookId));
}

/**
 * Align `bucketRankings` with finished `userBooks`, dedupe cross-bucket entries,
 * and recompute derived scores. Rankings order is preserved where possible.
 */
export function reconcileRankingsState(state: AppState): AppState {
  const rankings = emptyRankings();
  const placed = new Set<BookId>();

  for (const bucket of SENTIMENT_BUCKETS) {
    for (const id of state.bucketRankings[bucket] ?? []) {
      if (placed.has(id)) continue;
      const ub = state.userBooks[id];
      if (!ub || ub.shelf !== "finished") continue;
      if (ub.sentimentBucket && ub.sentimentBucket !== bucket) continue;
      rankings[bucket].push(id);
      placed.add(id);
    }
  }

  for (const [id, ub] of Object.entries(state.userBooks)) {
    if (!ub || ub.shelf !== "finished" || !ub.sentimentBucket) continue;
    if (placed.has(id)) {
      const currentBucket = SENTIMENT_BUCKETS.find((b) => rankings[b].includes(id));
      if (currentBucket === ub.sentimentBucket) continue;
      if (currentBucket) {
        rankings[currentBucket] = rankings[currentBucket].filter((bookId) => bookId !== id);
      }
      placed.delete(id);
    }
    rankings[ub.sentimentBucket].push(id);
    placed.add(id);
  }

  const nextUserBooks = { ...state.userBooks };
  for (const bucket of SENTIMENT_BUCKETS) {
    const ordered = rankings[bucket];
    const scores = computeDerivedScores(bucket, ordered);
    for (const id of ordered) {
      const ub = nextUserBooks[id];
      if (!ub) continue;
      nextUserBooks[id] = {
        ...ub,
        sentimentBucket: bucket,
        derivedScore: scores[id] ?? null,
      };
    }
  }

  return { ...state, bucketRankings: rankings, userBooks: nextUserBooks };
}
