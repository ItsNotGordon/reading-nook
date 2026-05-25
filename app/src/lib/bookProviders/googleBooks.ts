import { normalizeGenreList } from "@/lib/genreNormalize";
import { canonicalForSegment, type AcceptedGenre } from "@/lib/genreVocabulary";
import type { SearchBookResult } from "./types";

const GB_API_BASE = "https://www.googleapis.com/books/v1/volumes";

const SEARCH_FIELDS =
  "items(id,volumeInfo/title,volumeInfo/authors,volumeInfo/imageLinks/thumbnail,volumeInfo/pageCount,volumeInfo/categories,volumeInfo/publishedDate,volumeInfo/averageRating,volumeInfo/ratingsCount,volumeInfo/description,volumeInfo/language),totalItems";

function apiKey(): string {
  const key = process.env.GOOGLE_BOOKS_API_KEY ?? "";
  if (!key) {
    console.warn("[GoogleBooks] GOOGLE_BOOKS_API_KEY is not set");
  }
  return key;
}

type GBImageLinks = {
  smallThumbnail?: string;
  thumbnail?: string;
};

type GBVolumeInfo = {
  title?: string;
  authors?: string[];
  imageLinks?: GBImageLinks;
  pageCount?: number;
  categories?: string[];
  publishedDate?: string;
  averageRating?: number;
  ratingsCount?: number;
  description?: string;
  language?: string;
};

type GBVolumeItem = {
  id: string;
  volumeInfo?: GBVolumeInfo;
};

type GBSearchResponse = {
  totalItems?: number;
  items?: GBVolumeItem[];
};

function secureCoverUrl(url: string | undefined): string {
  if (!url) return "";
  return url.replace(/^http:\/\//, "https://");
}

function hiResCoverUrl(volumeId: string): string {
  return `https://books.google.com/books/publisher/content/images/frontcover/${volumeId}?fife=w400-h600&source=gbs_api`;
}

function parsePublishedYear(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const match = date.match(/(\d{4})/);
  if (!match) return undefined;
  const year = parseInt(match[1], 10);
  return Number.isFinite(year) ? year : undefined;
}

const MAX_GENRES = 6;

/**
 * Parse Google Books `categories` into canonical genre labels.
 * Categories look like "Fiction / Science Fiction / General" or just "Fiction".
 * Each segment is mapped through genreVocabulary's canonical lookup first,
 * then falls back to the raw segment for normalizeGenreList to handle.
 */
function parseCategories(categories: string[] | undefined): string[] {
  if (!categories || categories.length === 0) return [];
  const segments: string[] = [];
  for (const cat of categories) {
    for (const seg of cat.split(/\s*\/\s*/)) {
      const trimmed = seg.trim();
      if (!trimmed || trimmed.toLowerCase() === "general") continue;
      const canonical = canonicalForSegment(trimmed);
      segments.push(canonical ?? trimmed);
    }
  }
  return normalizeGenreList(segments).slice(0, MAX_GENRES);
}

function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

type DescGenreRule = readonly [RegExp, AcceptedGenre];

const DESC_GENRE_RULES: DescGenreRule[] = [
  [/\bdystopi(?:an|a)\b/i, "Dystopian"],
  [/\bpost[\s-]?apocalyptic\b/i, "Dystopian"],
  [/\bscience[\s-]?fiction\b/i, "Science fiction"],
  [/\bsci[\s-]?fi\b/i, "Science fiction"],
  [/\bthriller\b/i, "Thriller"],
  [/\bsuspense\b/i, "Suspense"],
  [/\bmystery\b/i, "Mystery"],
  [/\bdetective\b/i, "Mystery"],
  [/\bromance\b/i, "Romance"],
  [/\bfantasy\b/i, "Fantasy"],
  [/\bhorror\b/i, "Horror"],
  [/\badventure\b/i, "Adventure"],
  [/\bcoming[\s-]?of[\s-]?age\b/i, "Coming of age"],
  [/\bhistorical fiction\b/i, "Historical fiction"],
  [/\byoung[\s-]?adult\b/i, "Young adult"],
  [/\bmemoir\b/i, "Memoir"],
  [/\bcrime\b/i, "Crime"],
  [/\bwestern\b/i, "Western"],
  [/\bparanormal\b/i, "Paranormal"],
  [/\bsupernatural\b/i, "Paranormal"],
  [/\bvampire/i, "Paranormal"],
  [/\bwar\b/i, "War"],
  [/\bpoetry\b/i, "Poetry"],
  [/\bbiograph(?:y|ical)\b/i, "Biography"],
  [/\bautobiograph/i, "Memoir"],
  [/\bcomic(?:s|\sbook)/i, "Comics"],
  [/\bgraphic\s+novel/i, "Comics"],
  [/\bmanga\b/i, "Manga"],
  [/\btrue[\s-]?crime\b/i, "True crime"],
  [/\bself[\s-]?help\b/i, "Self-help"],
  [/\bpsycholog/i, "Psychology"],
  [/\bphilosoph/i, "Philosophy"],
];

/**
 * Extract additional genres by scanning a book's description for
 * confident genre keywords. Only returns genres not already present.
 */
function extractGenresFromDescription(
  description: string,
  existing: readonly string[],
): string[] {
  if (!description || description.length < 20) return [];
  const have = new Set(existing.map((g) => g.toLowerCase()));
  const found: string[] = [];
  for (const [pattern, genre] of DESC_GENRE_RULES) {
    if (have.has(genre.toLowerCase())) continue;
    if (pattern.test(description)) {
      have.add(genre.toLowerCase());
      found.push(genre);
    }
  }
  return found;
}

function volumeToBook(item: GBVolumeItem): SearchBookResult | null {
  const info = item.volumeInfo;
  if (!info?.title?.trim()) return null;

  const coverUrl =
    secureCoverUrl(info.imageLinks?.thumbnail) || hiResCoverUrl(item.id);

  const author =
    Array.isArray(info.authors) && info.authors.length > 0
      ? info.authors.join(", ")
      : "Unknown";

  const description = stripHtml(info.description);
  const categoryGenres = parseCategories(info.categories);
  const descGenres = extractGenresFromDescription(description, categoryGenres);
  const genres = normalizeGenreList([...categoryGenres, ...descGenres]).slice(
    0,
    MAX_GENRES,
  );

  return {
    id: `googlebooks:${item.id}`,
    title: info.title.trim(),
    author,
    coverUrl,
    totalPages:
      typeof info.pageCount === "number" && info.pageCount > 0
        ? info.pageCount
        : 0,
    genres,
    description,
    ...(parsePublishedYear(info.publishedDate) != null
      ? { publishedYear: parsePublishedYear(info.publishedDate) }
      : {}),
    ...(typeof info.averageRating === "number"
      ? { averageRating: info.averageRating }
      : {}),
    ...(typeof info.ratingsCount === "number" && info.ratingsCount > 0
      ? { ratingsCount: info.ratingsCount }
      : {}),
  };
}

async function gbFetch(url: string, context: string): Promise<Response> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const parsed = URL.canParse(url) ? new URL(url) : null;
    const safe = parsed
      ? `${parsed.pathname}${parsed.search.replace(/key=[^&]+/, "key=***")}`
      : "(url)";
    console.warn(`[GB:${context}] ${safe} -> ${res.status}`);
  }
  return res;
}

function dedupeBooks(items: GBVolumeItem[]): SearchBookResult[] {
  const books: SearchBookResult[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const book = volumeToBook(item);
    if (!book || seen.has(book.id)) continue;
    seen.add(book.id);
    books.push(book);
  }
  return books;
}

/** Search Google Books by title/author/keyword. */
export async function searchGoogleBooks(
  query: string,
  limit = 20,
  context = "search",
): Promise<SearchBookResult[]> {
  const cap = Math.min(Math.max(1, limit), 40);
  const url = new URL(GB_API_BASE);
  url.searchParams.set("q", query.trim());
  url.searchParams.set("langRestrict", "en");
  url.searchParams.set("maxResults", String(cap));
  url.searchParams.set("printType", "books");
  url.searchParams.set("fields", SEARCH_FIELDS);
  const key = apiKey();
  if (key) url.searchParams.set("key", key);

  const res = await gbFetch(url.toString(), context);
  if (!res.ok) throw new Error(`Google Books HTTP ${res.status}`);

  const data = (await res.json()) as GBSearchResponse;
  return dedupeBooks(data.items ?? []);
}

/** Look up a single book by ISBN. */
export async function searchGoogleBooksByIsbn(
  isbn: string,
  context = "isbn",
): Promise<SearchBookResult | null> {
  const url = new URL(GB_API_BASE);
  url.searchParams.set("q", `isbn:${isbn}`);
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("fields", SEARCH_FIELDS);
  const key = apiKey();
  if (key) url.searchParams.set("key", key);

  const res = await gbFetch(url.toString(), context);
  if (!res.ok) return null;

  const data = (await res.json()) as GBSearchResponse;
  const items = data.items ?? [];
  if (items.length === 0) return null;
  return volumeToBook(items[0]);
}

export type VolumeDetails = {
  description: string;
  genres: string[];
  title?: string;
};

/** Fetch full volume details (description + categories) by Google Books volume ID. */
export async function fetchGoogleBooksVolumeDetails(
  volumeId: string,
  context = "work",
): Promise<VolumeDetails | null> {
  const url = new URL(`${GB_API_BASE}/${volumeId}`);
  url.searchParams.set(
    "fields",
    "volumeInfo/title,volumeInfo/description,volumeInfo/categories",
  );
  const key = apiKey();
  if (key) url.searchParams.set("key", key);

  const res = await gbFetch(url.toString(), context);
  if (!res.ok) return null;

  const item = (await res.json()) as { volumeInfo?: GBVolumeInfo };
  const info = item.volumeInfo;
  if (!info) return null;

  const description = stripHtml(info.description);
  const categoryGenres = parseCategories(info.categories);
  const descGenres = extractGenresFromDescription(description, categoryGenres);
  const genres = normalizeGenreList([...categoryGenres, ...descGenres]).slice(
    0,
    MAX_GENRES,
  );

  return {
    description,
    genres,
    ...(info.title?.trim() ? { title: info.title.trim() } : {}),
  };
}

/** Discover popular books in a genre via subject search, sorted by ratingsCount client-side. */
export async function discoverGoogleBooksByGenre(
  genre: string,
  limit = 40,
  context = "discover",
): Promise<SearchBookResult[]> {
  const cap = Math.min(Math.max(1, limit), 40);
  const url = new URL(GB_API_BASE);
  url.searchParams.set("q", `subject:${genre}`);
  url.searchParams.set("langRestrict", "en");
  url.searchParams.set("maxResults", String(cap));
  url.searchParams.set("printType", "books");
  url.searchParams.set("orderBy", "relevance");
  url.searchParams.set("fields", SEARCH_FIELDS);
  const key = apiKey();
  if (key) url.searchParams.set("key", key);

  const res = await gbFetch(url.toString(), context);
  if (!res.ok) throw new Error(`Google Books HTTP ${res.status}`);

  const data = (await res.json()) as GBSearchResponse;
  const books = dedupeBooks(data.items ?? []);

  books.sort((a, b) => (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0));
  return books;
}

/** Extract the raw Google Books volume ID from a `googlebooks:` prefixed book ID. */
export function googleBooksIdToVolumeId(
  bookId: string,
): string | null {
  if (!bookId.startsWith("googlebooks:")) return null;
  const volumeId = bookId.slice("googlebooks:".length);
  return volumeId || null;
}
