import type { RecPersonalRow } from "@/lib/recPersonalization";
import type { AppState } from "@/lib/types";
import {
  cosineSimilarity,
  vectorForCandidate,
} from "./bookFeatureVector";
import { buildLibraryClusters, type LibraryClusterModel, type TasteCluster } from "./libraryClusters";
import {
  buildPopularityScoreMap,
  DEFAULT_POPULARITY_SCORE,
} from "./popularityScore";

export const CLUSTER_SOURCE = "Taste Groups";

const POPULARITY_BLEND = 0.15;

export type ClusterRecommendOptions = {
  maxResults?: number;
};

function toDisplayScore(raw: number): number {
  const clamped = Math.max(0, Math.min(1, raw));
  return Math.round((2 + clamped * 8) * 10) / 10;
}

function tieBreak(a: RecPersonalRow, b: RecPersonalRow): number {
  const popA = a.readinglogCount ?? 0;
  const popB = b.readinglogCount ?? 0;
  if (popB !== popA) return popB - popA;
  return a.bookId.localeCompare(b.bookId);
}

function sentimentReason(cluster: TasteCluster): string {
  const { ratedCount, liked, okay, disliked, displayName } = cluster;
  if (ratedCount === 0) {
    return `Near your ${displayName} group — not rated yet`;
  }
  if (liked >= okay && liked >= disliked && liked > 0) {
    return `Matches your ${displayName} group — mostly books you liked`;
  }
  if (disliked > liked && disliked >= okay) {
    return `Near your ${displayName} group — mixed or tough reads so far`;
  }
  return `Near your ${displayName} group — mixed feelings so far`;
}

function bestClusterMatch(
  candidateVec: ReturnType<typeof vectorForCandidate>,
  model: LibraryClusterModel,
): { cluster: TasteCluster; similarity: number } | null {
  let best: { cluster: TasteCluster; similarity: number } | null = null;
  for (const cluster of model.clusters) {
    const similarity = cosineSimilarity(candidateVec, cluster.centroid);
    if (!best || similarity > best.similarity) {
      best = { cluster, similarity };
    }
  }
  return best;
}

export function clusterRecommend(
  state: AppState,
  candidates: readonly RecPersonalRow[],
  options: ClusterRecommendOptions = {},
): RecPersonalRow[] {
  if (candidates.length === 0) return [];

  const model = buildLibraryClusters(state);
  if (!model) return [];

  const maxResults = options.maxResults ?? 30;
  const popularity = buildPopularityScoreMap(candidates);

  const scored = candidates.map((rec) => {
    const candidateVec = vectorForCandidate(rec, model.vocabulary);
    const match = bestClusterMatch(candidateVec, model);

    if (!match || match.similarity <= 0) {
      return {
        ...rec,
        score: toDisplayScore(0.25),
        source: CLUSTER_SOURCE,
        reason: "Similar to an outlier title in your library",
      };
    }

    const { cluster, similarity } = match;
    const tasteRaw = similarity * cluster.likeAffinity;
    const pop = popularity.get(rec.bookId) ?? DEFAULT_POPULARITY_SCORE;
    const blended = tasteRaw * (1 - POPULARITY_BLEND) + pop * POPULARITY_BLEND;

    return {
      ...rec,
      score: toDisplayScore(blended),
      source: CLUSTER_SOURCE,
      reason: sentimentReason(cluster),
    };
  });

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return tieBreak(a, b);
    })
    .slice(0, maxResults);
}
