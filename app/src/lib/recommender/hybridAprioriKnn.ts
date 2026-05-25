import {
  buildTasteSignals,
  scoreRecommendationPersonal,
  type RecPersonalRow,
} from "@/lib/recPersonalization";
import { normalizeGenreList } from "@/lib/genreNormalize";
import type { AppState } from "@/lib/types";
import {
  buildPopularityScoreMap,
  DEFAULT_POPULARITY_SCORE,
  popularityBottomThreshold,
} from "./popularityScore";
import { runWeightedApriori } from "./weightedApriori";
import { authorKey, buildWeightedTasteProfile, genreKey, topGenresByAffinity } from "./weightedTaste";
import { knnReasonFragment, predictLikeScore } from "./sentimentKnn";

export const HYBRID_SOURCE = "For You";

const MIN_FILTERED_CANDIDATES = 5;
const APRIORI_BLEND = 0.45;
const KNN_BLEND = 0.55;
const TASTE_WEIGHT = 0.72;
const POPULARITY_WEIGHT = 0.28;
const FIT_BASE = 2;
const FIT_SCALE = 6;
const FIT_MIN = 0.5;
const FIT_MAX = 10;

const SERENDIPITY_SLOTS = 6;
const TASTE_FIT_GEM_MIN = 0.55;
const POPULARITY_GEM_BOTTOM_FRACTION = 0.4;

export type HybridScoredRow = RecPersonalRow & {
  aprioriFit: number;
  knnFit: number;
  tasteFit: number;
  popularityScore: number;
};

export type HybridRecommendOptions = {
  maxResults?: number;
};

function roundFit(n: number): number {
  return Math.round(Math.min(FIT_MAX, Math.max(FIT_MIN, n)) * 10) / 10;
}

function aprioriFitForCandidate(
  genreKeys: string[],
  targetGenres: Set<string>,
  genreAffinity: Map<string, number>,
): number {
  if (genreKeys.length === 0) return 0;

  let targetOverlap = 0;
  for (const g of genreKeys) {
    if (targetGenres.has(g)) targetOverlap += 1;
  }
  const targetPart =
    targetGenres.size > 0 ? targetOverlap / Math.min(genreKeys.length, targetGenres.size) : 0;

  const affinities = genreKeys.map((g) => genreAffinity.get(g) ?? 0);
  const positiveSum = affinities.filter((a) => a > 0).reduce((s, a) => s + a, 0);
  const maxAffinity = Math.max(...[...genreAffinity.values()].filter((v) => v > 0), 1);
  const affinityPart = positiveSum > 0 ? positiveSum / (genreKeys.length * maxAffinity) : 0;

  return Math.min(1, 0.6 * targetPart + 0.4 * affinityPart);
}

function buildReason(
  ruleBlurbs: string[],
  knnFragment: string,
  penaltyBlurb: string | null,
  serendipity: boolean,
): string {
  const parts: string[] = [];
  if (ruleBlurbs.length > 0) {
    const genres = ruleBlurbs.slice(0, 3);
    if (genres.length === 1) {
      parts.push(`Based on your love of ${genres[0]}`);
    } else {
      const last = genres.pop()!;
      parts.push(`Based on your love of ${genres.join(", ")} and ${last}`);
    }
  } else {
    parts.push("Recommended from your reading history");
  }
  if (knnFragment) {
    parts.push(knnFragment);
  }
  if (penaltyBlurb && penaltyBlurb !== "Neutral for your taste so far.") {
    parts.push(penaltyBlurb);
  }
  if (serendipity) {
    parts.push("A hidden gem");
  }
  return parts.join(". ") + ".";
}

function candidateGenreKeys(genres: string[]): string[] {
  return normalizeGenreList(genres).map(genreKey).filter(Boolean);
}

function passesGenreFilter(genreKeys: string[], targetGenres: Set<string>): boolean {
  if (targetGenres.size === 0) return true;
  return genreKeys.some((g) => targetGenres.has(g));
}

function applySerendipitySlots(
  scored: HybridScoredRow[],
  limit: number,
): HybridScoredRow[] {
  if (scored.length <= limit) return scored;

  const sorted = [...scored].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.popularityScore !== a.popularityScore) return b.popularityScore - a.popularityScore;
    return a.bookId.localeCompare(b.bookId);
  });

  const mainCount = Math.max(0, limit - SERENDIPITY_SLOTS);
  const main = sorted.slice(0, mainCount);
  const mainIds = new Set(main.map((r) => r.bookId));
  const remaining = sorted.filter((r) => !mainIds.has(r.bookId));

  const popValues = sorted.map((r) => r.popularityScore);
  const popThreshold = popularityBottomThreshold(popValues, POPULARITY_GEM_BOTTOM_FRACTION);

  const gems: HybridScoredRow[] = [];
  for (const row of remaining) {
    if (gems.length >= SERENDIPITY_SLOTS) break;
    if (row.tasteFit < TASTE_FIT_GEM_MIN) continue;
    if (row.popularityScore > popThreshold) continue;
    const gemReason = row.reason.includes("hidden gem")
      ? row.reason
      : row.reason.replace(/\.$/, ". A hidden gem.");
    gems.push({ ...row, reason: gemReason });
  }

  return [...main, ...gems].slice(0, limit);
}

/**
 * Score and rank candidates with weighted Apriori + sentiment KNN + OL popularity blend.
 */
export function hybridAprioriKnnRecommend(
  state: AppState,
  candidates: readonly RecPersonalRow[],
  options: HybridRecommendOptions = {},
): HybridScoredRow[] {
  const profile = buildWeightedTasteProfile(state);
  if (!profile.active || candidates.length === 0) return [];

  const limit = options.maxResults ?? 30;
  const popularityMap = buildPopularityScoreMap(candidates);
  const { targetGenres, ruleBlurbs } = runWeightedApriori(profile);
  const signals = buildTasteSignals(state);

  let pool = candidates;
  if (targetGenres.size > 0) {
    const filtered = candidates.filter((c) =>
      passesGenreFilter(candidateGenreKeys(c.genres), targetGenres),
    );
    if (filtered.length >= MIN_FILTERED_CANDIDATES) {
      pool = filtered;
    }
  }

  const scored: HybridScoredRow[] = pool.map((rec) => {
    const genreKeys = candidateGenreKeys(rec.genres);
    const aprioriFit = aprioriFitForCandidate(genreKeys, targetGenres, profile.genreAffinity);
    const knn = predictLikeScore(profile.finishedRows, {
      genreKeys,
      authorKey: authorKey(rec.author),
    });
    const knnFit = knn.score;
    const tasteFit = APRIORI_BLEND * aprioriFit + KNN_BLEND * knnFit;
    const popularityScore = popularityMap.get(rec.bookId) ?? DEFAULT_POPULARITY_SCORE;

    const blend = TASTE_WEIGHT * tasteFit + POPULARITY_WEIGHT * popularityScore;
    let fit = FIT_BASE + FIT_SCALE * blend;

    const personal = scoreRecommendationPersonal(rec, signals);
    const neutralBlurb = "Neutral for your taste so far.";
    let penaltyBlurb: string | null = null;
    if (personal.blurb !== neutralBlurb) {
      const penalty = personal.fit - 5;
      if (penalty < 0) {
        fit += penalty;
        penaltyBlurb = personal.blurb;
      }
    }

    const reason = buildReason(ruleBlurbs, knnReasonFragment(knn), penaltyBlurb, false);

    return {
      ...rec,
      score: roundFit(fit),
      reason,
      source: HYBRID_SOURCE,
      aprioriFit,
      knnFit,
      tasteFit,
      popularityScore,
    };
  });

  return applySerendipitySlots(scored, limit);
}

/** Expose top genres for tests and UI helpers. */
export function getWeightedTopGenres(state: AppState, limit = 5): string[] {
  const profile = buildWeightedTasteProfile(state);
  return topGenresByAffinity(profile, limit);
}
