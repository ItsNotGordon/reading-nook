import { buildTasteSignals } from "@/lib/recPersonalization";
import type { AppState, SentimentBucket } from "@/lib/types";
import {
  buildLibraryVectors,
  buildVocabulary,
  centroid,
  termsForBook,
  type SparseVector,
} from "./bookFeatureVector";
import { clusterVectors } from "./dbscan";

export const MIN_SHELVED_FOR_CLUSTERS = 6;
export const MIN_CLUSTER_COUNT = 2;

export type TasteCluster = {
  id: number;
  centroid: SparseVector;
  bookCount: number;
  ratedCount: number;
  liked: number;
  okay: number;
  disliked: number;
  likeAffinity: number;
  topGenreLabels: string[];
  displayName: string;
};

export type LibraryClusterModel = {
  active: true;
  clusters: TasteCluster[];
  noiseCount: number;
  vocabulary: string[];
};

function sentimentWeight(bucket: SentimentBucket): number {
  if (bucket === "liked") return 1;
  if (bucket === "okay") return 0.5;
  return 0;
}

function titleCaseGenre(key: string): string {
  return key
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function clusterDisplayName(topGenres: string[]): string {
  if (topGenres.length === 0) return "Mixed taste";
  if (topGenres.length === 1) return titleCaseGenre(topGenres[0]);
  return `${titleCaseGenre(topGenres[0])} & ${titleCaseGenre(topGenres[1])}`;
}

function topGenresInCluster(
  state: AppState,
  bookIds: string[],
  max = 2,
): string[] {
  const counts = new Map<string, number>();
  for (const bookId of bookIds) {
    const book = state.catalog[bookId];
    if (!book) continue;
    for (const term of termsForBook(book)) {
      if (term.startsWith("author:")) continue;
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([genre]) => genre);
}

export function buildLibraryClusters(state: AppState): LibraryClusterModel | null {
  const signals = buildTasteSignals(state);
  if (!signals.active) return null;

  const libraryRows = buildLibraryVectors(state);
  if (libraryRows.length < MIN_SHELVED_FOR_CLUSTERS) return null;

  const vectors = libraryRows.map((r) => r.vector);
  const { assignments, clusterCount } = clusterVectors(vectors);
  if (clusterCount < MIN_CLUSTER_COUNT) return null;

  const vocabulary = buildVocabulary(
    libraryRows.map((r) => ({
      terms: [...r.vector.keys()],
    })),
  );

  const clusterMembers = new Map<number, string[]>();
  let noiseCount = 0;

  for (let i = 0; i < libraryRows.length; i += 1) {
    const assignment = assignments[i];
    const bookId = libraryRows[i].bookId;
    if (assignment === "noise") {
      noiseCount += 1;
      continue;
    }
    const list = clusterMembers.get(assignment) ?? [];
    list.push(bookId);
    clusterMembers.set(assignment, list);
  }

  const clusters: TasteCluster[] = [];

  for (const [id, bookIds] of clusterMembers) {
    const memberVectors = libraryRows
      .filter((r) => bookIds.includes(r.bookId))
      .map((r) => r.vector);
    const clusterCentroid = centroid(memberVectors);

    let liked = 0;
    let okay = 0;
    let disliked = 0;
    let affinitySum = 0;
    let ratedCount = 0;

    for (const bookId of bookIds) {
      const ub = state.userBooks[bookId];
      if (!ub || ub.shelf !== "finished" || !ub.sentimentBucket) continue;
      ratedCount += 1;
      if (ub.sentimentBucket === "liked") liked += 1;
      else if (ub.sentimentBucket === "okay") okay += 1;
      else disliked += 1;
      affinitySum += sentimentWeight(ub.sentimentBucket);
    }

    const likeAffinity = ratedCount > 0 ? affinitySum / ratedCount : 0.5;
    const topGenreLabels = topGenresInCluster(state, bookIds);

    clusters.push({
      id,
      centroid: clusterCentroid,
      bookCount: bookIds.length,
      ratedCount,
      liked,
      okay,
      disliked,
      likeAffinity,
      topGenreLabels,
      displayName: clusterDisplayName(topGenreLabels),
    });
  }

  clusters.sort((a, b) => b.bookCount - a.bookCount || a.id - b.id);

  if (clusters.length < MIN_CLUSTER_COUNT) return null;

  return {
    active: true,
    clusters,
    noiseCount,
    vocabulary,
  };
}
