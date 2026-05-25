import { normalizeGenreList } from "@/lib/genreNormalize";
import type { Book } from "@/lib/types";

const MAX_GENRES = 6;

type WorkDetailsResponse = {
  description?: string;
  genres?: string[];
  title?: string;
};

/**
 * Enrich a book with description + genres from the /api/books/work endpoint.
 * Works for `googlebooks:` IDs (primary) and gracefully no-ops for legacy `openlibrary:` IDs.
 */
export async function enrichBook(book: Book): Promise<Book> {
  if (!book.id.startsWith("googlebooks:") && !book.id.startsWith("openlibrary:")) {
    return book;
  }

  try {
    const params = new URLSearchParams({ id: book.id });
    if (book.title.trim()) params.set("title", book.title.trim());
    const res = await fetch(`/api/books/work?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return book;

    const data = (await res.json()) as WorkDetailsResponse;
    const genres = normalizeGenreList([...(data.genres ?? []), ...book.genres]).slice(
      0,
      MAX_GENRES,
    );
    const description =
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : book.description;

    const title =
      typeof data.title === "string" && data.title.trim() ? data.title.trim() : book.title;

    return { ...book, title, description, genres };
  } catch {
    return book;
  }
}

/** @deprecated Use `enrichBook` instead. Kept for backward compatibility. */
export const enrichOpenLibraryBook = enrichBook;
