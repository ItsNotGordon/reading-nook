import type { Book, BookId } from "./types";

export const PLACEHOLDER_COVER_PREFIX = "https://placehold.co/";

/** Strip Goodreads spreadsheet wrappers and non-digit chars; keep 10- or 13-digit ISBNs. */
export function normalizeIsbn(raw: string): string {
  let v = raw.trim();
  if (v.startsWith('="') && v.endsWith('"')) {
    v = v.slice(2, -1);
  }
  v = v.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (v.length === 10 || v.length === 13) return v;
  return "";
}

/**
 * Strip series suffixes like "(Series Name, #1)" or trailing " #3".
 */
export function stripSeriesInfo(title: string): string {
  let t = title.trim();
  t = t.replace(/\s*\([^)]*#\d+[^)]*\)\s*$/, "");
  t = t.replace(/\s*\([^)]*,\s*(?:book|vol\.?|volume|part)\s+\d+[^)]*\)\s*$/i, "");
  t = t.replace(/\s+#\d+\s*$/, "");
  t = t.replace(/,?\s+(?:book|vol\.?|volume|part)\s+\d+\s*$/i, "");
  return t.trim();
}

export function normalizeTitle(title: string): string {
  return stripSeriesInfo(title).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** First author when Goodreads lists "Last, First" or multiple authors. */
export function getPrimaryAuthor(author: string): string {
  const raw = author.trim();
  if (!raw) return "";
  const first = raw.split(/,|&| and /i)[0]?.trim() ?? raw;
  if (first.includes(",") && !first.includes(" ")) {
    const parts = first.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) return `${parts[1]} ${parts[0]}`.trim();
  }
  return first;
}

export function normalizeAuthor(author: string): string {
  return getPrimaryAuthor(author).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isPlaceholderCover(coverUrl: string | undefined): boolean {
  if (!coverUrl || coverUrl.trim() === "") return true;
  return coverUrl.startsWith(PLACEHOLDER_COVER_PREFIX);
}

/**
 * Canonical match key for cross-user / cross-source book identity.
 * Priority: ISBN13 → ISBN10 → normalized title + primary author.
 */
export function getBookMatchKey(book: Book | undefined, _bookId?: BookId): string | null {
  if (!book) return null;
  const isbn13 = book.isbn13 ? normalizeIsbn(book.isbn13) : "";
  if (isbn13.length === 13) return `isbn13:${isbn13}`;
  const isbn10 = book.isbn10 ? normalizeIsbn(book.isbn10) : "";
  if (isbn10.length === 10) return `isbn10:${isbn10}`;

  const title = normalizeTitle(book.title);
  const author = normalizeAuthor(book.author);
  if (title.length < 2 || author.length < 2) return null;
  return `title-author:${title}|${author}`;
}

export function titlesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length >= 3 && longer.startsWith(shorter)) return true;
  return false;
}

export function booksMatchByIdentity(a: Book | undefined, b: Book | undefined): boolean {
  const keyA = getBookMatchKey(a);
  const keyB = getBookMatchKey(b);
  if (!keyA || !keyB) return false;
  return keyA === keyB;
}

export function isbnFieldsMatch(
  a: { isbn10?: string; isbn13?: string },
  b: { isbn10?: string; isbn13?: string },
): boolean {
  const a13 = a.isbn13 ? normalizeIsbn(a.isbn13) : "";
  const b13 = b.isbn13 ? normalizeIsbn(b.isbn13) : "";
  if (a13 && b13 && a13 === b13) return true;
  const a10 = a.isbn10 ? normalizeIsbn(a.isbn10) : "";
  const b10 = b.isbn10 ? normalizeIsbn(b.isbn10) : "";
  if (a10 && b10 && a10 === b10) return true;
  return false;
}
