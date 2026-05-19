import { parseOpenLibrarySubjects } from "./openLibrarySubjects";
import type { SearchBookResult } from "./types";

const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_WORKS_BASE = "https://openlibrary.org/works";

type OpenLibraryDoc = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  subject?: string[];
};

type OpenLibrarySearchPayload = {
  docs?: OpenLibraryDoc[];
};

type OpenLibraryWorkPayload = {
  description?: string | { value?: string };
  subjects?: string[];
};

export function openLibraryIdToWorkKey(bookId: string): string | null {
  const prefix = "openlibrary:";
  if (!bookId.startsWith(prefix)) return null;
  const workId = bookId.slice(prefix.length).trim();
  return workId || null;
}

function workKeyToId(key: string): string {
  const trimmed = key.trim();
  const withoutPrefix = trimmed.startsWith("/works/")
    ? trimmed.slice("/works/".length)
    : trimmed.startsWith("works/")
      ? trimmed.slice("works/".length)
      : trimmed;
  return `openlibrary:${withoutPrefix}`;
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

  return {
    id: workKeyToId(doc.key),
    title: doc.title.trim(),
    author: author || "Unknown",
    coverUrl,
    totalPages: 0,
    genres: parseOpenLibrarySubjects(doc.subject ?? []),
    description: "",
    ...(publishedYear != null ? { publishedYear } : {}),
  };
}

/** Search Open Library (no API key required). */
export async function searchOpenLibraryBooks(
  query: string,
  limit = 20,
): Promise<SearchBookResult[]> {
  const url = new URL(OPEN_LIBRARY_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(Math.max(1, limit), 50)));
  url.searchParams.set(
    "fields",
    "key,title,author_name,cover_i,first_publish_year,subject",
  );

  const res = await fetch(url.toString(), { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Open Library HTTP ${res.status}`);
  }

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

  return books;
}

/** Fetch work JSON for description and subjects (use on shelf add, not per search row). */
export async function fetchOpenLibraryWorkDetails(
  bookId: string,
): Promise<Pick<SearchBookResult, "description" | "genres"> | null> {
  const workKey = openLibraryIdToWorkKey(bookId);
  if (!workKey) return null;

  const res = await fetch(`${OPEN_LIBRARY_WORKS_BASE}/${workKey}.json`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Open Library work HTTP ${res.status}`);
  }

  const payload = (await res.json()) as OpenLibraryWorkPayload;
  const description = parseWorkDescription(payload.description);
  const genres = parseOpenLibrarySubjects(payload.subjects ?? []);

  return { description, genres };
}
