import {
  centroid,
  cosineDistance,
  type SparseVector,
} from "./bookFeatureVector";

export type ClusterAssignment = number | "noise";

export const DEFAULT_DBSCAN_EPS = 0.55;
export const DEFAULT_DBSCAN_MIN_PTS = 2;

export type DbscanResult = {
  assignments: ClusterAssignment[];
  clusterCount: number;
  usedFallback: boolean;
};

function euclideanOnKeys(a: SparseVector, b: SparseVector, keys: string[]): number {
  let sum = 0;
  for (const key of keys) {
    const diff = (a.get(key) ?? 0) - (b.get(key) ?? 0);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function allTerms(vectors: SparseVector[]): string[] {
  const set = new Set<string>();
  for (const vec of vectors) {
    for (const key of vec.keys()) set.add(key);
  }
  return [...set];
}

function kMeans(vectors: SparseVector[], k: number, maxIter = 25): ClusterAssignment[] {
  if (vectors.length === 0) return [];
  if (k >= vectors.length) {
    return vectors.map((_, i) => i);
  }

  const keys = allTerms(vectors);
  const centroids: SparseVector[] = [];
  const step = Math.max(1, Math.floor(vectors.length / k));
  for (let i = 0; i < k; i += 1) {
    centroids.push(new Map(vectors[Math.min(i * step, vectors.length - 1)]));
  }

  const assignments: number[] = new Array(vectors.length).fill(0);

  for (let iter = 0; iter < maxIter; iter += 1) {
    let changed = false;
    for (let i = 0; i < vectors.length; i += 1) {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c += 1) {
        const dist = euclideanOnKeys(vectors[i], centroids[c], keys);
        if (dist < bestDist) {
          bestDist = dist;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }
    if (!changed) break;

    for (let c = 0; c < k; c += 1) {
      const members = vectors.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        centroids[c] = centroid(members);
      }
    }
  }

  return assignments;
}

function runDbscan(
  vectors: SparseVector[],
  eps: number,
  minPts: number,
): ClusterAssignment[] {
  const n = vectors.length;
  const labels: ClusterAssignment[] = new Array(n).fill("noise");
  let clusterId = 0;

  function regionQuery(idx: number): number[] {
    const neighbors: number[] = [];
    for (let j = 0; j < n; j += 1) {
      if (cosineDistance(vectors[idx], vectors[j]) <= eps) {
        neighbors.push(j);
      }
    }
    return neighbors;
  }

  for (let i = 0; i < n; i += 1) {
    if (labels[i] !== "noise") continue;
    const neighbors = regionQuery(i);
    if (neighbors.length < minPts) continue;

    labels[i] = clusterId;
    const queue = neighbors.filter((j) => j !== i);

    while (queue.length > 0) {
      const q = queue.shift()!;
      if (typeof labels[q] === "number" && labels[q] !== clusterId) {
        continue;
      }
      if (labels[q] === "noise") {
        labels[q] = clusterId;
      }

      const qNeighbors = regionQuery(q);
      if (qNeighbors.length >= minPts) {
        for (const j of qNeighbors) {
          if (labels[j] === "noise") {
            labels[j] = clusterId;
            queue.push(j);
          }
        }
      }
    }

    clusterId += 1;
  }

  return labels;
}

/**
 * DBSCAN on cosine distance. Falls back to K-means when ≤1 cluster is found.
 */
export function clusterVectors(
  vectors: SparseVector[],
  options: { eps?: number; minPts?: number } = {},
): DbscanResult {
  const eps = options.eps ?? DEFAULT_DBSCAN_EPS;
  const minPts = options.minPts ?? DEFAULT_DBSCAN_MIN_PTS;
  const n = vectors.length;

  if (n === 0) {
    return { assignments: [], clusterCount: 0, usedFallback: false };
  }
  if (n === 1) {
    return { assignments: [0], clusterCount: 1, usedFallback: true };
  }

  const labels = runDbscan(vectors, eps, minPts);
  const distinctClusters = new Set(
    labels.filter((l): l is number => typeof l === "number"),
  );

  if (distinctClusters.size <= 1) {
    const k = Math.min(3, Math.max(2, Math.floor(n / 4)));
    const fallbackAssignments = kMeans(vectors, k);
    return {
      assignments: fallbackAssignments,
      clusterCount: new Set(fallbackAssignments).size,
      usedFallback: true,
    };
  }

  return {
    assignments: labels,
    clusterCount: distinctClusters.size,
    usedFallback: false,
  };
}
