import type { AppState, Book, SentimentBucket, UserBook } from "./types";

type BookWithMeta = { book: Book; userBook: UserBook };

/** Per-book genre weight when ranking taste from finished books. */
const WEIGHT_LIKED = 2;
const WEIGHT_OKAY = 1;
const WEIGHT_DISLIKED = 0;
/** When there are no finished books yet, all shelved books count equally. */
const WEIGHT_NEUTRAL_SHELF = 1;

export function topCounts(items: string[], limit: number): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const raw of items) {
    const label = raw.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function buildUserEntries(state: AppState): BookWithMeta[] {
  const out: BookWithMeta[] = [];
  for (const ub of Object.values(state.userBooks)) {
    if (!ub) continue;
    const book = state.catalog[ub.bookId];
    if (!book) continue;
    out.push({ book, userBook: ub });
  }
  return out;
}

function weightForFinishedSentiment(bucket: SentimentBucket | null): number {
  if (bucket === "liked") return WEIGHT_LIKED;
  if (bucket === "okay") return WEIGHT_OKAY;
  if (bucket === "disliked") return WEIGHT_DISLIKED;
  return WEIGHT_OKAY;
}

/**
 * Sum genre labels with per-book weights. When `useSentimentWeights` is false, every book uses
 * {@link WEIGHT_NEUTRAL_SHELF} (no-finished-yet / all-shelved case).
 */
function topWeightedGenreRowsFromEntries(
  entries: BookWithMeta[],
  useSentimentWeights: boolean,
  limit: number,
): Array<{ label: string; count: number }> {
  const sums = new Map<string, number>();
  for (const e of entries) {
    const w = useSentimentWeights
      ? weightForFinishedSentiment(e.userBook.sentimentBucket)
      : WEIGHT_NEUTRAL_SHELF;
    if (w === 0) continue;
    for (const raw of e.book.genres ?? []) {
      const label = raw.trim();
      if (!label) continue;
      sums.set(label, (sums.get(label) ?? 0) + w);
    }
  }
  if (sums.size === 0) return [];
  return [...sums.entries()]
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

/**
 * Same source rule as Profile: finished books' genres if any finished, else all shelved books.
 * When using finished books, each genre is weighted by sentiment (liked > okay; disliked skips).
 * If every finished book is disliked (no weighted signal), falls back to raw finished genre counts.
 */
export function getUserTopGenreRows(
  state: AppState,
  limit = 5,
): Array<{ label: string; count: number }> {
  const userEntries = buildUserEntries(state);
  const finishedEntries = userEntries.filter((e) => e.userBook.shelf === "finished");
  const hasFinished = finishedEntries.length > 0;
  const genreSource = hasFinished ? finishedEntries : userEntries;

  const weighted = topWeightedGenreRowsFromEntries(genreSource, hasFinished, limit);
  if (weighted.length > 0) return weighted;

  if (hasFinished) {
    return topCounts(
      finishedEntries.flatMap((e) => e.book.genres ?? []),
      limit,
    );
  }
  return topCounts(
    genreSource.flatMap((e) => e.book.genres ?? []),
    limit,
  );
}

export function getUserTopGenreLabels(state: AppState, limit = 5): string[] {
  return getUserTopGenreRows(state, limit).map((r) => r.label);
}

/** Order filter chips: user top genres (that appear in recs) first, then rest A–Z. */
export function sortRecGenresForFilter(
  state: AppState,
  unionLowerToDisplay: Map<string, string>,
): string[] {
  const top = getUserTopGenreLabels(state, 5);
  const out: string[] = [];
  const taken = new Set<string>();
  for (const lbl of top) {
    const k = lbl.trim().toLowerCase();
    const d = unionLowerToDisplay.get(k);
    if (d) {
      out.push(d);
      taken.add(k);
    }
  }
  const rest = [...unionLowerToDisplay.entries()]
    .filter(([k]) => !taken.has(k))
    .sort((a, b) => a[1].toLowerCase().localeCompare(b[1].toLowerCase()))
    .map(([, d]) => d);
  return [...out, ...rest];
}
