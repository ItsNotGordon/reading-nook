import {
  looksNonEnglishTitle,
  resolveEnglishDisplayTitle,
  resolveEnglishTitlesForBooks,
} from "./englishTitle";
import { openLibraryIdToWorkKey, workKeyToOpenLibraryId } from "./openLibraryIds";
import { olFetch } from "./olFetch";
import { resolveCanonicalGenreFromQuery } from "@/lib/genreVocabulary";
import { canonicalGenreToOlSubject } from "./genreToOlSubject";
import { parseOpenLibrarySubjects } from "./openLibrarySubjects";
import type { SearchBookResult } from "./types";

export { openLibraryIdToWorkKey } from "./openLibraryIds";

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_WORKS_BASE = "https://openlibrary.org/works";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
  ratings_count?: number;
  ratings_average?: number;
  readinglog_count?: number;
  want_to_read_count?: number;
  already_read_count?: number;
};

const SEARCH_FIELDS =
  "key,title,author_name,cover_i,first_publish_year,subject,ratings_count,ratings_average,readinglog_count,want_to_read_count,already_read_count";

type OpenLibrarySearchPayload = {
  docs?: OpenLibraryDoc[];
};

type OpenLibraryWorkPayload = {
  description?: string | { value?: string };
  subjects?: string[];
};

function positiveInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.floor(value);
}

function readinglogFromDoc(doc: OpenLibraryDoc): number | undefined {
  const direct = positiveInt(doc.readinglog_count);
  if (direct != null) return direct;
  const want = positiveInt(doc.want_to_read_count) ?? 0;
  const read = positiveInt(doc.already_read_count) ?? 0;
  const sum = want + read;
  return sum > 0 ? sum : undefined;
}

function parseWorkDescription(value: OpenLibraryWorkPayload["description"]): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof value.value === "string") {
    return value.value.trim();
  }
  return "";
}

function docToBook(doc: OpenLibraryDoc): SearchBookResult | null {
  if (!doc.key || typeof doc.title !== "string" || !doc.title.trim()) return null;

  const author =
    Array.isArray(doc.author_name) && doc.author_name.length > 0
      ? doc.author_name.filter((a) => typeof a === "string" && a.trim()).join(", ")
      : "Unknown";

  const coverUrl =
    typeof doc.cover_i === "number" && Number.isFinite(doc.cover_i)
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : "";

  const publishedYear =
    typeof doc.first_publish_year === "number" && Number.isFinite(doc.first_publish_year)
      ? Math.round(doc.first_publish_year)
      : undefined;

  const ratingsCount = positiveInt(doc.ratings_count);
  const readinglogCount = readinglogFromDoc(doc);
  const ratingsAverage =
    typeof doc.ratings_average === "number" && Number.isFinite(doc.ratings_average)
      ? doc.ratings_average
      : undefined;

  return {
    id: workKeyToOpenLibraryId(doc.key),
    title: doc.title.trim(),
    author: author || "Unknown",
    coverUrl,
    totalPages: 0,
    genres: parseOpenLibrarySubjects(doc.subject ?? []),
    description: "",
    ...(publishedYear != null ? { publishedYear } : {}),
    ...(ratingsCount != null ? { ratingsCount } : {}),
    ...(ratingsAverage != null ? { averageRating: ratingsAverage } : {}),
    ...(readinglogCount != null ? { readinglogCount } : {}),
  };
}

const RETRY_DELAYS_MS = [2000, 5000, 10000];

async function fetchWithRetry(url: string, context = "ol"): Promise<Response> {
  const res = await olFetch(url, context);
  if (res.ok) return res;

  // 403 = blocked; do not retry, throw immediately
  if (res.status === 403) {
    throw new Error(`Open Library HTTP 403`);
  }

  // Only retry 429 (rate-limited)
  if (res.status === 429) {
    let lastError: Error = new Error(`Open Library HTTP 429`);
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
      const delay = RETRY_DELAYS_MS[attempt];
      console.log(
        `[OL:${context}] 429 rate-limited, retrying in ${delay}ms (${attempt + 1}/${RETRY_DELAYS_MS.length})`,
      );
      await new Promise((r) => setTimeout(r, delay));
      const retry = await olFetch(url, context);
      if (retry.ok) return retry;
      if (retry.status === 403) throw new Error(`Open Library HTTP 403`);
      lastError = new Error(`Open Library HTTP ${retry.status}`);
      if (retry.status !== 429) throw lastError;
    }
    throw lastError;
  }

  throw new Error(`Open Library HTTP ${res.status}`);
}

async function fetchOpenLibrarySearch(url: URL, context = "search"): Promise<SearchBookResult[]> {
  const res = await fetchWithRetry(url.toString(), context);
  const payload = (await res.json()) as OpenLibrarySearchPayload;
  const docs = payload.docs ?? [];
  const books: SearchBookResult[] = [];
  const seen = new Set<string>();
  for (const doc of docs) {
    const book = docToBook(doc);
    if (!book || seen.has(book.id)) continue;
    seen.add(book.id);
    books.push(book);
  }
  return resolveEnglishTitlesForBooks(books);
}

/** Search Open Library (no API key required). */
export async function searchOpenLibraryBooks(
  query: string,
  limit = 20,
  context = "search",
): Promise<SearchBookResult[]> {
  const cap = Math.min(Math.max(1, limit), 50);
  const canonicalGenre = resolveCanonicalGenreFromQuery(query);

  const engUrl = new URL(OPEN_LIBRARY_SEARCH_URL);
  engUrl.searchParams.set("q", query.trim());
  engUrl.searchParams.set("lang", "eng");
  engUrl.searchParams.set("limit", String(cap));
  engUrl.searchParams.set("fields", SEARCH_FIELDS);

  const [byGenre, engResults] = await Promise.all([
    canonicalGenre
      ? discoverOpenLibraryByGenre(canonicalGenre, cap, context).catch(() => [] as SearchBookResult[])
      : Promise.resolve([] as SearchBookResult[]),
    fetchOpenLibrarySearch(engUrl, context),
  ]);

  const seen = new Set<string>();
  const merged: SearchBookResult[] = [];
  for (const book of [...byGenre, ...engResults]) {
    if (seen.has(book.id)) continue;
    seen.add(book.id);
    merged.push(book);
    if (merged.length >= cap) break;
  }

  const FALLBACK_THRESHOLD = 3;
  if (merged.length < FALLBACK_THRESHOLD) {
    const fallbackUrl = new URL(OPEN_LIBRARY_SEARCH_URL);
    fallbackUrl.searchParams.set("q", query.trim());
    fallbackUrl.searchParams.set("limit", String(cap));
    fallbackUrl.searchParams.set("fields", SEARCH_FIELDS);
    const fallback = await fetchOpenLibrarySearch(fallbackUrl, context);
    for (const book of fallback) {
      if (seen.has(book.id)) continue;
      if (looksNonEnglishTitle(book.title)) continue;
      seen.add(book.id);
      merged.push(book);
      if (merged.length >= cap) break;
    }
  }

  return merged;
}

/** Popular works for a canonical genre (sorted by reading-log activity). */
export async function discoverOpenLibraryByGenre(
  genreLabel: string,
  limit = 25,
  context = "discover",
): Promise<SearchBookResult[]> {
  const subject = canonicalGenreToOlSubject(genreLabel);
  if (!subject) return [];

  const url = new URL(OPEN_LIBRARY_SEARCH_URL);
  url.searchParams.set("q", `subject:(${subject})`);
  url.searchParams.set("lang", "eng");
  url.searchParams.set("sort", "readinglog");
  url.searchParams.set("limit", String(Math.min(Math.max(1, limit), 50)));
  url.searchParams.set("fields", SEARCH_FIELDS);
  return fetchOpenLibrarySearch(url, context);
}

/* ------------------------------------------------------------------ */
/*  ISBN Lookup                                                        */
/* ------------------------------------------------------------------ */

type OpenLibraryIsbnPayload = {
  title?: string;
  authors?: { key: string }[];
  covers?: number[];
  number_of_pages?: number;
  publish_date?: string;
  works?: { key: string }[];
};

type OpenLibraryAuthorPayload = {
  name?: string;
};

async function fetchAuthorName(authorKey: string, context = "isbn"): Promise<string> {
  try {
    const res = await fetchWithRetry(`https://openlibrary.org${authorKey}.json`, context);
    const data = (await res.json()) as OpenLibraryAuthorPayload;
    return typeof data.name === "string" ? data.name.trim() : "";
  } catch {
    return "";
  }
}

function parsePublishYear(publishDate: string | undefined): number | undefined {
  if (!publishDate) return undefined;
  const match = publishDate.match(/(\d{4})/);
  if (!match) return undefined;
  const year = parseInt(match[1], 10);
  return Number.isFinite(year) ? year : undefined;
}

export async function lookupByIsbn(
  isbn: string,
  context = "isbn",
): Promise<SearchBookResult | null> {
  let res: Response;
  try {
    res = await fetchWithRetry(`https://openlibrary.org/isbn/${isbn}.json`, context);
  } catch {
    return null;
  }
  const data = (await res.json()) as OpenLibraryIsbnPayload;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) return null;

  const workKey = data.works?.[0]?.key;
  const id = workKey ? workKeyToOpenLibraryId(workKey) : `isbn:${isbn}`;

  const authorKeys = data.authors?.map((a) => a.key).filter(Boolean) ?? [];
  const authorNames = await Promise.all(authorKeys.map((k) => fetchAuthorName(k, context)));
  const author = authorNames.filter(Boolean).join(", ") || "Unknown";

  const coverUrl =
    Array.isArray(data.covers) && data.covers.length > 0
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`
      : `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

  const totalPages =
    typeof data.number_of_pages === "number" && data.number_of_pages > 0
      ? data.number_of_pages
      : 0;

  const publishedYear = parsePublishYear(data.publish_date);

  return {
    id,
    title,
    author,
    coverUrl,
    totalPages,
    genres: [],
    description: "",
    ...(publishedYear != null ? { publishedYear } : {}),
  };
}

export type OpenLibraryWorkDetails = Pick<
  SearchBookResult,
  "description" | "genres"
> & {
  title?: string;
};

/** Fetch work JSON for description and subjects (use on shelf add, not per search row). */
export async function fetchOpenLibraryWorkDetails(
  bookId: string,
  options: { catalogTitle?: string; context?: string } = {},
): Promise<OpenLibraryWorkDetails | null> {
  const ctx = options.context ?? "work";
  const workKey = openLibraryIdToWorkKey(bookId);
  if (!workKey) return null;

  const res = await fetchWithRetry(`${OPEN_LIBRARY_WORKS_BASE}/${workKey}.json`, ctx);

  const payload = (await res.json()) as OpenLibraryWorkPayload & { title?: string };
  const description = parseWorkDescription(payload.description);
  const genres = parseOpenLibrarySubjects(payload.subjects ?? []);

  const workTitle =
    typeof payload.title === "string" ? payload.title.trim() : "";
  const seedTitle = options.catalogTitle?.trim() || workTitle;
  let title: string | undefined;
  if (seedTitle && looksNonEnglishTitle(seedTitle)) {
    title = await resolveEnglishDisplayTitle(bookId, seedTitle);
  }

  return {
    description,
    genres,
    ...(title ? { title } : {}),
  };
}
