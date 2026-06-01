import { estimatedRangeMidpoint } from "./progress";
import type { ShelfItem } from "./shelfItems";
import type { Book, BookId, Shelf, UserBook } from "./types";

export type RatingsSortKey =
  | "score_desc"
  | "score_asc"
  | "finished_desc"
  | "finished_asc"
  | "added_desc"
  | "added_asc"
  | "title_asc"
  | "title_desc"
  | "author_asc"
  | "author_desc"
  | "progress_desc"
  | "progress_asc";

export const SORT_LABELS: Record<RatingsSortKey, string> = {
  score_desc: "Score: high to low",
  score_asc: "Score: low to high",
  finished_desc: "Date finished: newest first",
  finished_asc: "Date finished: oldest first",
  added_desc: "Date added: newest first",
  added_asc: "Date added: oldest first",
  title_asc: "Title: A–Z",
  title_desc: "Title: Z–A",
  author_asc: "Author: A–Z",
  author_desc: "Author: Z–A",
  progress_desc: "Progress: most complete first",
  progress_asc: "Progress: least complete first",
};

/** Shorter labels for the Ratings sort dropdown. */
export const SORT_LABELS_SHORT: Record<RatingsSortKey, string> = {
  score_desc: "Score ↓",
  score_asc: "Score ↑",
  finished_desc: "Finished ↓",
  finished_asc: "Finished ↑",
  added_desc: "Added ↓",
  added_asc: "Added ↑",
  title_asc: "Title A–Z",
  title_desc: "Title Z–A",
  author_asc: "Author A–Z",
  author_desc: "Author Z–A",
  progress_desc: "Most read",
  progress_asc: "Least read",
};

const FINISHED_SORT_OPTIONS: RatingsSortKey[] = [
  "score_desc",
  "score_asc",
  "finished_desc",
  "finished_asc",
  "added_desc",
  "added_asc",
  "title_asc",
  "title_desc",
  "author_asc",
  "author_desc",
];

const READING_SORT_OPTIONS: RatingsSortKey[] = [
  "added_desc",
  "added_asc",
  "progress_desc",
  "progress_asc",
  "title_asc",
  "title_desc",
  "author_asc",
  "author_desc",
];

const SIMPLE_SHELF_SORT_OPTIONS: RatingsSortKey[] = [
  "added_desc",
  "added_asc",
  "title_asc",
  "title_desc",
  "author_asc",
  "author_desc",
];

export function sortOptionsForShelf(shelf: Shelf): RatingsSortKey[] {
  if (shelf === "finished") return FINISHED_SORT_OPTIONS;
  if (shelf === "reading") return READING_SORT_OPTIONS;
  return SIMPLE_SHELF_SORT_OPTIONS;
}

export function defaultSortForShelf(shelf: Shelf): RatingsSortKey {
  return shelf === "finished" ? "score_desc" : "added_desc";
}

export function isValidSortForShelf(shelf: Shelf, sort: string | null): sort is RatingsSortKey {
  if (!sort) return false;
  return sortOptionsForShelf(shelf).includes(sort as RatingsSortKey);
}

export function parseRatingsSortParam(shelf: Shelf, value: string | null): RatingsSortKey {
  if (value && isValidSortForShelf(shelf, value)) return value;
  return defaultSortForShelf(shelf);
}

/** When switching shelves, keep sort if valid on the new shelf; otherwise use default. */
export function resolveSortWhenShelfChanges(
  newShelf: Shelf,
  currentSort: RatingsSortKey,
): RatingsSortKey {
  if (isValidSortForShelf(newShelf, currentSort)) return currentSort;
  return defaultSortForShelf(newShelf);
}

function timestampMs(iso: string | null | undefined): number {
  if (!iso) return -Infinity;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : -Infinity;
}

function rowFinishedMs(row: RatingsFinishedRow): number {
  return timestampMs(row.finishedSortAt ?? row.finishedAt ?? row.addedAt);
}

function addedTimestampMs(ub: UserBook): number {
  return timestampMs(ub.addedAt);
}

function normalizeTitle(title: string): string {
  const t = title.trim();
  return t === "" ? "\uffff" : t.toLowerCase();
}

function normalizeAuthor(author: string): string {
  const a = author.trim();
  return a === "" ? "\uffff" : a.toLowerCase();
}

function compareTitleAuthorId(
  aTitle: string,
  aAuthor: string,
  aId: BookId,
  bTitle: string,
  bAuthor: string,
  bId: BookId,
): number {
  const t = aTitle.localeCompare(bTitle, undefined, { sensitivity: "base" });
  if (t !== 0) return t;
  const au = aAuthor.localeCompare(bAuthor, undefined, { sensitivity: "base" });
  if (au !== 0) return au;
  return aId.localeCompare(bId);
}

/** 0–1 reading progress; unknown counts as 0. */
export function readingProgressFraction(book: Book, userBook: UserBook): number {
  if (userBook.progressMode === "exact") {
    if (book.totalPages > 0 && userBook.currentPage != null) {
      const total = Math.max(1, book.totalPages);
      const page = Math.min(total, Math.max(0, Math.floor(userBook.currentPage)));
      return page / total;
    }
    return 0;
  }
  if (userBook.progressMode === "estimated" && userBook.estimatedRange) {
    return estimatedRangeMidpoint(userBook.estimatedRange);
  }
  return 0;
}

export type RatingsFinishedRow = {
  id: BookId;
  title: string;
  author: string;
  score: number | null;
  addedAt: string;
  finishedAt: string | null;
  finishedSortAt: string | null;
};

function compareFinishedRows(a: RatingsFinishedRow, b: RatingsFinishedRow, sort: RatingsSortKey): number {
  const aTitle = normalizeTitle(a.title);
  const bTitle = normalizeTitle(b.title);
  const aAuthor = normalizeAuthor(a.author);
  const bAuthor = normalizeAuthor(b.author);

  let primary = 0;
  switch (sort) {
    case "score_desc": {
      const aScore = a.score ?? -Infinity;
      const bScore = b.score ?? -Infinity;
      primary = bScore - aScore;
      break;
    }
    case "score_asc": {
      const aScore = a.score ?? Infinity;
      const bScore = b.score ?? Infinity;
      primary = aScore - bScore;
      break;
    }
    case "finished_desc":
      primary = rowFinishedMs(b) - rowFinishedMs(a);
      break;
    case "finished_asc":
      primary = rowFinishedMs(a) - rowFinishedMs(b);
      break;
    case "added_desc":
      primary = timestampMs(b.addedAt) - timestampMs(a.addedAt);
      break;
    case "added_asc":
      primary = timestampMs(a.addedAt) - timestampMs(b.addedAt);
      break;
    case "title_asc":
      primary = aTitle.localeCompare(bTitle, undefined, { sensitivity: "base" });
      break;
    case "title_desc":
      primary = bTitle.localeCompare(aTitle, undefined, { sensitivity: "base" });
      break;
    case "author_asc":
      primary = aAuthor.localeCompare(bAuthor, undefined, { sensitivity: "base" });
      break;
    case "author_desc":
      primary = bAuthor.localeCompare(aAuthor, undefined, { sensitivity: "base" });
      break;
    default:
      break;
  }

  if (primary !== 0) return primary;
  return compareTitleAuthorId(aTitle, aAuthor, a.id, bTitle, bAuthor, b.id);
}

export function sortFinishedRatingRows<T extends RatingsFinishedRow>(
  rows: T[],
  sort: RatingsSortKey,
): T[] {
  return [...rows].sort((a, b) => compareFinishedRows(a, b, sort));
}

function compareShelfItems(a: ShelfItem, b: ShelfItem, sort: RatingsSortKey): number {
  const aTitle = normalizeTitle(a.book.title);
  const bTitle = normalizeTitle(b.book.title);
  const aAuthor = normalizeAuthor(a.book.author);
  const bAuthor = normalizeAuthor(b.book.author);

  let primary = 0;
  switch (sort) {
    case "added_desc":
      primary = addedTimestampMs(b.userBook) - addedTimestampMs(a.userBook);
      break;
    case "added_asc":
      primary = addedTimestampMs(a.userBook) - addedTimestampMs(b.userBook);
      break;
    case "progress_desc":
      primary =
        readingProgressFraction(b.book, b.userBook) -
        readingProgressFraction(a.book, a.userBook);
      break;
    case "progress_asc":
      primary =
        readingProgressFraction(a.book, a.userBook) -
        readingProgressFraction(b.book, b.userBook);
      break;
    case "title_asc":
      primary = aTitle.localeCompare(bTitle, undefined, { sensitivity: "base" });
      break;
    case "title_desc":
      primary = bTitle.localeCompare(aTitle, undefined, { sensitivity: "base" });
      break;
    case "author_asc":
      primary = aAuthor.localeCompare(bAuthor, undefined, { sensitivity: "base" });
      break;
    case "author_desc":
      primary = bAuthor.localeCompare(aAuthor, undefined, { sensitivity: "base" });
      break;
    default:
      break;
  }

  if (primary !== 0) return primary;
  return compareTitleAuthorId(
    aTitle,
    aAuthor,
    a.userBook.bookId,
    bTitle,
    bAuthor,
    b.userBook.bookId,
  );
}

export function sortShelfItems(items: ShelfItem[], sort: RatingsSortKey): ShelfItem[] {
  return [...items].sort((a, b) => compareShelfItems(a, b, sort));
}
