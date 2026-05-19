import { OPEN_LIBRARY_MAX_GENRES } from "@/lib/bookProviders/openLibrarySubjects";
import { normalizeGenreList } from "@/lib/genreNormalize";
import type { Book } from "@/lib/types";

type WorkDetailsResponse = {
  description?: string;
  genres?: string[];
};

/** Load description + subjects from Open Library work JSON when adding to shelf. */
export async function enrichOpenLibraryBook(book: Book): Promise<Book> {
  if (!book.id.startsWith("openlibrary:")) return book;

  try {
    const res = await fetch(`/api/books/work?id=${encodeURIComponent(book.id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return book;

    const data = (await res.json()) as WorkDetailsResponse;
    const genres = normalizeGenreList([...(data.genres ?? []), ...book.genres]).slice(
      0,
      OPEN_LIBRARY_MAX_GENRES,
    );
    const description =
      typeof data.description === "string" && data.description.trim()
        ? data.description.trim()
        : book.description;

    return { ...book, description, genres };
  } catch {
    return book;
  }
}
