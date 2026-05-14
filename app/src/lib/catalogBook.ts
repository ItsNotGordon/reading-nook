import type { Book } from "./types";
import { normalizeGenreList } from "./genreNormalize";

/** Row shape in `public/data/books.json` (from `scripts/build-book-catalog.js`). */
export type CatalogJsonBook = {
  id: string | number;
  title: string;
  author: string;
  coverUrl?: string;
  totalPages?: number;
  genres?: string[];
  description?: string;
  publishedYear?: number;
  averageRating?: number;
  ratingsCount?: number;
};

const PLACEHOLDER_COVER =
  "https://placehold.co/200x300/faf6ef/6b6560/png?text=Book";

function normalizeCoverUrl(raw?: string): string {
  const u = raw?.trim() ?? "";
  if (!u) return PLACEHOLDER_COVER;
  const lower = u.toLowerCase();
  if (
    lower.includes("nophoto") ||
    lower.includes("_noimage_") ||
    lower.includes("noimage")
  ) {
    return PLACEHOLDER_COVER;
  }
  return u;
}

function normalizeGenres(genres: unknown): string[] {
  if (!Array.isArray(genres)) return [];
  const raw = genres
    .filter((g): g is string => typeof g === "string")
    .map((g) => g.trim())
    .filter(Boolean);
  return normalizeGenreList(raw);
}

/** Normalize catalog JSON into the in-app `Book` shape for store and UI. */
export function catalogJsonToBook(row: CatalogJsonBook): Book {
  const totalPages =
    typeof row.totalPages === "number" &&
    Number.isFinite(row.totalPages) &&
    row.totalPages > 0
      ? Math.floor(row.totalPages)
      : 0;

  const id = typeof row.id === "number" && Number.isFinite(row.id) ? String(row.id) : String(row.id ?? "");

  return {
    id,
    title: row.title || "Untitled",
    author: row.author || "Unknown",
    coverUrl: normalizeCoverUrl(row.coverUrl),
    totalPages,
    genres: normalizeGenres(row.genres),
    description: row.description?.trim() ?? "",
    ...(row.publishedYear != null && Number.isFinite(row.publishedYear)
      ? { publishedYear: Math.round(row.publishedYear) }
      : {}),
    ...(row.averageRating != null && Number.isFinite(row.averageRating)
      ? { averageRating: row.averageRating }
      : {}),
    ...(row.ratingsCount != null && Number.isFinite(row.ratingsCount)
      ? { ratingsCount: Math.floor(row.ratingsCount) }
      : {}),
  };
}

export function isCatalogJsonBook(value: unknown): value is CatalogJsonBook {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const idOk =
    (typeof v.id === "string" && v.id.length > 0) ||
    (typeof v.id === "number" && Number.isFinite(v.id));
  if (!idOk || typeof v.title !== "string" || typeof v.author !== "string") {
    return false;
  }
  if (v.genres !== undefined && !Array.isArray(v.genres)) return false;
  return true;
}
