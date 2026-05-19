import { OPEN_LIBRARY_MAX_GENRES } from "@/lib/bookProviders/openLibrarySubjects";
import { normalizeGenreList } from "@/lib/genreNormalize";
import type { Book } from "@/lib/types";

type WorkDetailsResponse = {
  description?: string;
  genres?: string[];
  title?: string;
};

/** Load description + subjects from Open Library work JSON when adding to shelf. */
export async function enrichOpenLibraryBook(book: Book): Promise<Book> {
  if (!book.id.startsWith("openlibrary:")) return book;

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
      OPEN_LIBRARY_MAX_GENRES,
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
