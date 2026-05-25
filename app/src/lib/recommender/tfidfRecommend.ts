import { normalizeGenreList } from "@/lib/genreNormalize";
import type { RecPersonalRow } from "@/lib/recPersonalization";
import type { AppState } from "@/lib/types";
import { buildWeightedTasteProfile, genreKey } from "./weightedTaste";

export const TFIDF_SOURCE = "Similar Vibes";

const TERM_BOOST_LIKED = 1;
const TERM_BOOST_OKAY = 0.45;
const TERM_PENALTY_DISLIKED = -0.75;

export type TfidfRecommendOptions = {
  maxResults?: number;
};

type Vector = Map<string, number>;

function termsForCandidate(rec: RecPersonalRow): string[] {
  const genres = normalizeGenreList(rec.genres ?? []).map(genreKey).filter(Boolean);
  const author = rec.author.trim().toLowerCase();
  return author ? [...genres, `author:${author}`] : genres;
}

function addWeight(target: Map<string, number>, key: string, delta: number): void {
  target.set(key, (target.get(key) ?? 0) + delta);
}

function buildUserTermCounts(state: AppState): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ub of Object.values(state.userBooks)) {
    if (!ub || ub.shelf !== "finished" || !ub.sentimentBucket) continue;
    const book = state.catalog[ub.bookId];
    if (!book) continue;
    const terms = termsForCandidate({
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      genres: book.genres ?? [],
      score: 0,
      reason: "",
      source: "",
    });
    const termSet = new Set(terms);
    const delta =
      ub.sentimentBucket === "liked"
        ? TERM_BOOST_LIKED
        : ub.sentimentBucket === "okay"
          ? TERM_BOOST_OKAY
          : TERM_PENALTY_DISLIKED;
    for (const term of termSet) addWeight(counts, term, delta);
  }
  return counts;
}

function computeIdf(candidates: readonly RecPersonalRow[]): Map<string, number> {
  const docFreq = new Map<string, number>();
  for (const rec of candidates) {
    const uniq = new Set(termsForCandidate(rec));
    for (const term of uniq) docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
  }
  const n = Math.max(1, candidates.length);
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((1 + n) / (1 + df)) + 1);
  }
  return idf;
}

function buildUserVector(userTermCounts: Map<string, number>, idf: Map<string, number>): Vector {
  const out = new Map<string, number>();
  for (const [term, count] of userTermCounts) {
    const idfTerm = idf.get(term) ?? 1;
    out.set(term, count * idfTerm);
  }
  return out;
}

function buildCandidateVector(rec: RecPersonalRow, idf: Map<string, number>): Vector {
  const out = new Map<string, number>();
  const tf = new Map<string, number>();
  for (const term of termsForCandidate(rec)) tf.set(term, (tf.get(term) ?? 0) + 1);
  for (const [term, count] of tf) {
    out.set(term, count * (idf.get(term) ?? 1));
  }
  return out;
}

function dot(a: Vector, b: Vector): number {
  let sum = 0;
  for (const [term, w] of a) {
    const bw = b.get(term);
    if (bw != null) sum += w * bw;
  }
  return sum;
}

function norm(a: Vector): number {
  let sum = 0;
  for (const w of a.values()) sum += w * w;
  return Math.sqrt(sum);
}

function cosine(a: Vector, b: Vector): number {
  const denom = norm(a) * norm(b);
  if (denom === 0) return 0;
  return dot(a, b) / denom;
}

function tieBreak(a: RecPersonalRow, b: RecPersonalRow): number {
  const popA = a.readinglogCount ?? 0;
  const popB = b.readinglogCount ?? 0;
  if (popB !== popA) return popB - popA;
  return a.bookId.localeCompare(b.bookId);
}

function toDisplayScore(sim: number): number {
  const clamped = Math.max(0, Math.min(1, sim));
  return Math.round((2 + clamped * 8) * 10) / 10;
}

export function tfidfRecommend(
  state: AppState,
  candidates: readonly RecPersonalRow[],
  options: TfidfRecommendOptions = {},
): RecPersonalRow[] {
  if (candidates.length === 0) return [];
  const profile = buildWeightedTasteProfile(state);
  if (!profile.active) return [];

  const maxResults = options.maxResults ?? 30;
  const userTermCounts = buildUserTermCounts(state);
  const idf = computeIdf(candidates);
  const userVector = buildUserVector(userTermCounts, idf);

  const scored = candidates.map((rec) => {
    const candidateVector = buildCandidateVector(rec, idf);
    const similarity = cosine(userVector, candidateVector);
    return {
      ...rec,
      score: toDisplayScore(similarity),
      source: TFIDF_SOURCE,
      reason: "Matches the genres and authors from your finished books.",
    };
  });

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return tieBreak(a, b);
    })
    .slice(0, maxResults);
}
