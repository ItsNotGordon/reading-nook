import type { UserBook } from "./types";

/** Fraction ranges for “I don’t know the page” progress (0–1). */
export const ESTIMATED_PROGRESS_RANGES: ReadonlyArray<[number, number]> = [
  [0, 0.25],
  [0.25, 0.5],
  [0.5, 0.75],
  [0.75, 1],
] as const;

const EPS = 1e-4;

function close(a: number, b: number): boolean {
  return Math.abs(a - b) < EPS;
}

export function matchesCanonicalRange(
  range: [number, number],
): [number, number] | null {
  const [a, b] = range;
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return null;
  for (const cand of ESTIMATED_PROGRESS_RANGES) {
    if (close(cand[0], a) && close(cand[1], b)) {
      return [cand[0], cand[1]];
    }
  }
  return null;
}

/** Map legacy 0–1 fraction (midpoint) to the overlapping canonical band during migration. */
export function fractionToEstimatedRange(f: number): [number, number] {
  const x = Math.min(1, Math.max(0, f));
  if (x < 0.25 - EPS) return [0, 0.25];
  if (x < 0.5 - EPS) return [0.25, 0.5];
  if (x < 0.75 - EPS) return [0.5, 0.75];
  return [0.75, 1];
}

export function estimatedRangeMidpoint(range: [number, number]): number {
  return (range[0] + range[1]) / 2;
}

export function estimatedRangeWidth01(range: [number, number]): number {
  return Math.min(1, Math.max(0, range[1] - range[0]));
}

/** Second line under the bar, e.g. "~25–50%". */
export function formatEstimatedPercentRange(range: [number, number]): string {
  const lo = Math.round(range[0] * 100);
  const hi = Math.round(range[1] * 100);
  return `~${lo}–${hi}%`;
}

/** Short qualitative line for estimated bands. */
export function estimatedQualitativeLabel(range: [number, number]): string {
  const m = matchesCanonicalRange(range);
  if (!m) return "Estimated progress";
  if (m[0] === 0 && m[1] === 0.25) return "Early on";
  if (m[0] === 0.25 && m[1] === 0.5) return "Getting into it";
  if (m[0] === 0.5 && m[1] === 0.75) return "Around halfway";
  return "Nearly done";
}

export function formatExactProgressLines(
  currentPage: number,
  totalPages: number,
): { pagesLine: string; pctLine: string; pct: number } {
  const total = Math.max(1, totalPages);
  const page = Math.min(total, Math.max(0, Math.floor(currentPage)));
  const pct = Math.round((page / total) * 100);
  return {
    pagesLine: `${page} / ${totalPages} pages`,
    pctLine: `${pct}%`,
    pct,
  };
}

export function userBookShowsProgress(ub: UserBook): boolean {
  if (ub.progressMode === "exact") {
    return ub.currentPage !== null;
  }
  return ub.estimatedRange !== null;
}
