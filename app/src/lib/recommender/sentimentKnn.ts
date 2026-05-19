import type { FinishedBookRow } from "./weightedTaste";

export const DEFAULT_K = 5;
const AUTHOR_MATCH_BONUS = 0.15;

export type KnnCandidate = {
  genreKeys: string[];
  authorKey: string;
};

export type KnnPrediction = {
  score: number;
  neighborCount: number;
  likedNeighborCount: number;
};

function buildGenreIndex(rows: FinishedBookRow[], candidate?: KnnCandidate): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    for (const g of r.genreKeys) set.add(g);
  }
  if (candidate) {
    for (const g of candidate.genreKeys) set.add(g);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function vectorForGenres(genreKeys: string[], vocabulary: string[]): number[] {
  const set = new Set(genreKeys);
  return vocabulary.map((g) => (set.has(g) ? 1 : 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function distanceFromSimilarity(sim: number, authorMatch: boolean): number {
  const base = 1 - sim;
  return Math.max(0, base - (authorMatch ? AUTHOR_MATCH_BONUS : 0));
}

/**
 * Predict how much the user would like a candidate (0–1) from k nearest finished books.
 */
export function predictLikeScore(
  training: FinishedBookRow[],
  candidate: KnnCandidate,
  k: number = DEFAULT_K,
): KnnPrediction {
  if (training.length === 0) {
    return { score: 0.5, neighborCount: 0, likedNeighborCount: 0 };
  }

  const vocabulary = buildGenreIndex(training, candidate);
  const candidateVec = vectorForGenres(candidate.genreKeys, vocabulary);

  const neighbors = training
    .map((row) => {
      const rowVec = vectorForGenres(row.genreKeys, vocabulary);
      const sim = cosineSimilarity(candidateVec, rowVec);
      const authorMatch =
        Boolean(candidate.authorKey) &&
        Boolean(row.authorKey) &&
        candidate.authorKey === row.authorKey;
      return {
        row,
        distance: distanceFromSimilarity(sim, authorMatch),
        sim,
      };
    })
    .sort((a, b) => a.distance - b.distance);

  const withOverlap = neighbors.filter((n) => n.sim > 0);
  const pool = withOverlap.length > 0 ? withOverlap : neighbors;
  const effectiveK = Math.min(k, pool.length);
  const top = pool.slice(0, effectiveK);

  if (withOverlap.length === 0) {
    return { score: 0.5, neighborCount: 0, likedNeighborCount: 0 };
  }

  let weightSum = 0;
  let labelSum = 0;
  let likedNeighborCount = 0;

  for (const n of top) {
    const w = n.distance < 1e-9 ? 1e6 : 1 / n.distance;
    weightSum += w;
    labelSum += w * n.row.knnLabel;
    if (n.row.sentiment === "liked") likedNeighborCount += 1;
  }

  const score = weightSum > 0 ? labelSum / weightSum : 0.5;

  return {
    score: Math.min(1, Math.max(0, score)),
    neighborCount: effectiveK,
    likedNeighborCount,
  };
}

export function knnReasonFragment(prediction: KnnPrediction): string {
  if (prediction.neighborCount === 0) return "KNN: no finished books to compare";
  if (prediction.likedNeighborCount > 0) {
    return `KNN: similar to ${prediction.likedNeighborCount} book(s) you liked`;
  }
  return `KNN: similar to ${prediction.neighborCount} finished book(s)`;
}
