import type { AppState, Book, UserBook } from "./types";

type BookWithMeta = { book: Book; userBook: UserBook };

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

/** Same source rule as Profile: finished books' genres if any finished, else all shelved books. */
export function getUserTopGenreRows(
  state: AppState,
  limit = 5,
): Array<{ label: string; count: number }> {
  const userEntries = buildUserEntries(state);
  const finishedEntries = userEntries.filter((e) => e.userBook.shelf === "finished");
  const genreSource = finishedEntries.length > 0 ? finishedEntries : userEntries;
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
