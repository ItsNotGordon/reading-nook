import type {
  AppState,
  Book,
  BookId,
  BucketRankings,
  SentimentBucket,
  Shelf,
  UserBook,
} from "./types";
import { SENTIMENT_BUCKETS } from "./types";
import { computeDerivedScores } from "./ranking";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type GoodreadsRow = {
  bookId: string;
  title: string;
  author: string;
  isbn: string;
  isbn13: string;
  myRating: number;
  averageRating: number | null;
  numberOfPages: number;
  yearPublished: number | null;
  originalPublicationYear: number | null;
  dateRead: string;
  dateAdded: string;
  exclusiveShelf: string;
  bookshelves: string;
  myReview: string;
  privateNotes: string;
};

export type ImportRow = GoodreadsRow & {
  shelf: Shelf;
  sentiment: SentimentBucket | null;
  catalogBook: Book;
  isDuplicate: boolean;
};

export type ImportSummary = {
  totalRows: number;
  toImport: number;
  duplicates: number;
  byShelf: Record<Shelf, number>;
  bySentiment: Record<SentimentBucket | "unrated", number>;
  customShelfCount: number;
  duplicateRows: ImportRow[];
  importRows: ImportRow[];
};

/* ------------------------------------------------------------------ */
/*  CSV Parsing                                                        */
/* ------------------------------------------------------------------ */

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && i + 1 < text.length && text[i + 1] === "\n") {
        i++;
      }
      if (current.trim()) rows.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) rows.push(current);
  return rows;
}

/** Strip Goodreads `="0451526538"` wrapper from ISBN fields. */
export function cleanIsbn(raw: string): string {
  let v = raw.trim();
  if (v.startsWith('="') && v.endsWith('"')) {
    v = v.slice(2, -1);
  }
  v = v.replace(/[^0-9Xx]/g, "");
  if (v.length !== 10 && v.length !== 13) return "";
  return v;
}

const REQUIRED_HEADERS = ["Title", "Author", "Exclusive Shelf"];

export function parseGoodreadsCsv(text: string): GoodreadsRow[] {
  const lines = splitCsvRows(text);
  if (lines.length < 2) throw new Error("CSV file is empty or has no data rows.");

  const headerFields = parseCsvLine(lines[0]);
  const headerMap = new Map<string, number>();
  for (let i = 0; i < headerFields.length; i++) {
    headerMap.set(headerFields[i].trim(), i);
  }

  for (const req of REQUIRED_HEADERS) {
    if (!headerMap.has(req)) {
      throw new Error(`Missing required column: "${req}". Is this a Goodreads export?`);
    }
  }

  const col = (row: string[], name: string): string => {
    const idx = headerMap.get(name);
    if (idx === undefined || idx >= row.length) return "";
    return row[idx].trim();
  };

  const intCol = (row: string[], name: string): number => {
    const v = parseInt(col(row, name), 10);
    return Number.isFinite(v) ? v : 0;
  };

  const floatCol = (row: string[], name: string): number | null => {
    const v = parseFloat(col(row, name));
    return Number.isFinite(v) ? v : null;
  };

  const intOrNull = (row: string[], name: string): number | null => {
    const v = parseInt(col(row, name), 10);
    return Number.isFinite(v) ? v : null;
  };

  const rows: GoodreadsRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const title = col(fields, "Title");
    const author = col(fields, "Author");
    if (!title && !author) continue;

    rows.push({
      bookId: col(fields, "Book Id"),
      title,
      author: author || "Unknown",
      isbn: cleanIsbn(col(fields, "ISBN")),
      isbn13: cleanIsbn(col(fields, "ISBN13")),
      myRating: intCol(fields, "My Rating"),
      averageRating: floatCol(fields, "Average Rating"),
      numberOfPages: intCol(fields, "Number of Pages"),
      yearPublished: intOrNull(fields, "Year Published"),
      originalPublicationYear: intOrNull(fields, "Original Publication Year"),
      dateRead: col(fields, "Date Read"),
      dateAdded: col(fields, "Date Added"),
      exclusiveShelf: col(fields, "Exclusive Shelf"),
      bookshelves: col(fields, "Bookshelves"),
      myReview: col(fields, "My Review"),
      privateNotes: col(fields, "Private Notes"),
    });
  }

  if (rows.length === 0) {
    throw new Error("No valid book rows found in the CSV.");
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/*  Shelf & Sentiment Mapping                                          */
/* ------------------------------------------------------------------ */

const SHELF_MAP: Record<string, Shelf> = {
  read: "finished",
  "currently-reading": "reading",
  "to-read": "want_to_read",
};

export function mapShelf(exclusiveShelf: string): Shelf {
  return SHELF_MAP[exclusiveShelf.trim().toLowerCase()] ?? "want_to_read";
}

export function isCustomShelf(exclusiveShelf: string): boolean {
  const key = exclusiveShelf.trim().toLowerCase();
  return key !== "" && !(key in SHELF_MAP);
}

export function mapRatingToSentiment(
  rating: number,
  shelf: Shelf,
): SentimentBucket | null {
  if (shelf !== "finished") return null;
  if (rating >= 4) return "liked";
  if (rating === 3) return "okay";
  if (rating >= 1) return "disliked";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Book ID & Catalog Entry                                            */
/* ------------------------------------------------------------------ */

const PLACEHOLDER_COVER =
  "https://placehold.co/200x300/faf6ef/6b6560/png?text=Book";

export function goodreadsImportId(goodreadsBookId: string): BookId {
  return `goodreads-import:${goodreadsBookId}`;
}

export function buildCatalogBook(row: GoodreadsRow): Book {
  const publishedYear =
    row.originalPublicationYear ?? row.yearPublished ?? undefined;
  const book: Book = {
    id: goodreadsImportId(row.bookId),
    title: row.title,
    author: row.author,
    coverUrl: PLACEHOLDER_COVER,
    totalPages: row.numberOfPages > 0 ? row.numberOfPages : 0,
    genres: [],
    description: "",
  };
  if (publishedYear != null) book.publishedYear = publishedYear;
  if (row.averageRating != null) book.averageRating = row.averageRating;
  return book;
}

/* ------------------------------------------------------------------ */
/*  Duplicate Detection                                                */
/* ------------------------------------------------------------------ */

/**
 * Strip Goodreads series suffixes like "(Series Name, #1)" or trailing " #3".
 * Examples:
 *   "Dune (Dune, #1)"                          → "Dune"
 *   "The Hobbit (The Lord of the Rings, #0)"    → "The Hobbit"
 *   "Dune #1"                                   → "Dune"
 *   "A Game of Thrones (A Song of Ice and Fire)" → "A Game of Thrones"
 */
export function stripSeriesInfo(title: string): string {
  let t = title.trim();
  // Remove trailing parenthetical that contains "#" or looks like a series name
  t = t.replace(/\s*\([^)]*#\d+[^)]*\)\s*$/, "");
  // Remove trailing parenthetical that looks like "(Series Name)"
  t = t.replace(/\s*\([^)]*,\s*(?:book|vol\.?|volume|part)\s+\d+[^)]*\)\s*$/i, "");
  // Remove trailing standalone series marker like " #1" or " Book 1"
  t = t.replace(/\s+#\d+\s*$/, "");
  t = t.replace(/,?\s+(?:book|vol\.?|volume|part)\s+\d+\s*$/i, "");
  return t.trim();
}

function normalizeForMatch(s: string): string {
  return stripSeriesInfo(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titlesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  // Substring match: "dune" matches "dunechronicles1"
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length >= 3 && longer.startsWith(shorter)) return true;
  return false;
}

export function findDuplicate(
  row: GoodreadsRow,
  catalog: Record<BookId, Book>,
  userBooks: Partial<Record<BookId, UserBook>>,
): boolean {
  const importId = goodreadsImportId(row.bookId);
  if (userBooks[importId]) return true;

  const normTitle = normalizeForMatch(row.title);
  const normAuthor = normalizeForMatch(row.author);
  if (!normTitle) return false;

  for (const book of Object.values(catalog)) {
    if (!book) continue;
    if (!userBooks[book.id]) continue;
    const catTitle = normalizeForMatch(book.title);
    const catAuthor = normalizeForMatch(book.author);
    if (catAuthor !== normAuthor) continue;
    if (titlesMatch(catTitle, normTitle)) return true;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/*  Import Summary                                                     */
/* ------------------------------------------------------------------ */

export function buildImportPlan(
  grRows: GoodreadsRow[],
  state: AppState,
): ImportSummary {
  const byShelf: Record<Shelf, number> = {
    want_to_read: 0,
    reading: 0,
    finished: 0,
  };
  const bySentiment: Record<SentimentBucket | "unrated", number> = {
    liked: 0,
    okay: 0,
    disliked: 0,
    unrated: 0,
  };

  let duplicates = 0;
  let customShelfCount = 0;
  const importRows: ImportRow[] = [];
  const duplicateRows: ImportRow[] = [];

  for (const row of grRows) {
    const shelf = mapShelf(row.exclusiveShelf);
    const sentiment = mapRatingToSentiment(row.myRating, shelf);
    const catalogBook = buildCatalogBook(row);
    const isDuplicate = findDuplicate(row, state.catalog, state.userBooks);

    if (isCustomShelf(row.exclusiveShelf)) customShelfCount++;

    const importRow: ImportRow = {
      ...row,
      shelf,
      sentiment,
      catalogBook,
      isDuplicate,
    };

    if (isDuplicate) {
      duplicates++;
      duplicateRows.push(importRow);
    } else {
      byShelf[shelf]++;
      if (shelf === "finished") {
        bySentiment[sentiment ?? "unrated"]++;
      }
      importRows.push(importRow);
    }
  }

  return {
    totalRows: grRows.length,
    toImport: importRows.length,
    duplicates,
    byShelf,
    bySentiment,
    customShelfCount,
    duplicateRows,
    importRows,
  };
}

/* ------------------------------------------------------------------ */
/*  Merge into AppState                                                */
/* ------------------------------------------------------------------ */

function parseIsoDate(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function buildUserBook(row: ImportRow): UserBook {
  const nowIso = new Date().toISOString();
  const addedAt = parseIsoDate(row.dateAdded) ?? nowIso;

  if (row.shelf === "finished") {
    const finishedAt = parseIsoDate(row.dateRead) ?? addedAt;
    return {
      bookId: row.catalogBook.id,
      shelf: "finished",
      progressMode: "estimated",
      currentPage: null,
      estimatedRange: [1, 1],
      finishedAt,
      finishedSortAt: finishedAt,
      sentimentBucket: row.sentiment,
      derivedScore: null,
      addedAt,
      notes: [row.myReview, row.privateNotes].filter(Boolean).join("\n\n").slice(0, 8000),
    };
  }

  const totalPages = row.catalogBook.totalPages;
  return {
    bookId: row.catalogBook.id,
    shelf: row.shelf,
    progressMode: totalPages > 0 ? "exact" : "estimated",
    currentPage: totalPages > 0 ? 1 : null,
    estimatedRange: totalPages > 0 ? null : [0, 0.25],
    finishedAt: null,
    finishedSortAt: null,
    sentimentBucket: null,
    derivedScore: null,
    addedAt,
    notes: "",
  };
}

function buildBucketOrder(
  rows: ImportRow[],
  bucket: SentimentBucket,
): BookId[] {
  const inBucket = rows.filter(
    (r) => r.shelf === "finished" && r.sentiment === bucket,
  );

  inBucket.sort((a, b) => {
    if (b.myRating !== a.myRating) return b.myRating - a.myRating;
    const dateA = a.dateRead || a.dateAdded || "";
    const dateB = b.dateRead || b.dateAdded || "";
    if (dateB > dateA) return 1;
    if (dateB < dateA) return -1;
    return 0;
  });

  return inBucket.map((r) => r.catalogBook.id);
}

export function mergeImportIntoState(
  existing: AppState,
  importRows: ImportRow[],
): AppState {
  const catalog = { ...existing.catalog };
  const userBooks: Partial<Record<BookId, UserBook>> = { ...existing.userBooks };

  for (const row of importRows) {
    const id = row.catalogBook.id;
    if (!catalog[id]) catalog[id] = row.catalogBook;
    if (!userBooks[id]) userBooks[id] = buildUserBook(row);
  }

  const bucketRankings: BucketRankings = {
    liked: [...existing.bucketRankings.liked],
    okay: [...existing.bucketRankings.okay],
    disliked: [...existing.bucketRankings.disliked],
  };

  for (const bucket of SENTIMENT_BUCKETS) {
    const newIds = buildBucketOrder(importRows, bucket);
    const existingSet = new Set(bucketRankings[bucket]);
    for (const id of newIds) {
      if (!existingSet.has(id)) {
        bucketRankings[bucket].push(id);
      }
    }
  }

  const nextUserBooks = { ...userBooks };
  for (const bucket of SENTIMENT_BUCKETS) {
    const ordered = bucketRankings[bucket];
    const scores = computeDerivedScores(bucket, ordered);
    for (const id of ordered) {
      const ub = nextUserBooks[id];
      if (!ub) continue;
      nextUserBooks[id] = { ...ub, derivedScore: scores[id] ?? null };
    }
  }

  return {
    ...existing,
    catalog,
    userBooks: nextUserBooks,
    bucketRankings,
  };
}
