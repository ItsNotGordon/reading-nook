import type { Book } from "@/lib/types";
import { normalizeGenreList } from "@/lib/genreNormalize";

export type BookSearchProvider = "openlibrary";

export type SearchBookResult = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  totalPages: number;
  genres: string[];
  description: string;
  publishedYear?: number;
  averageRating?: number;
  ratingsCount?: number;
};

export type BookSearchResponse = {
  provider: BookSearchProvider;
  books: SearchBookResult[];
};

/** Map provider result into in-app `Book` (no placeholder cover injection). */
export function toAppBook(result: SearchBookResult): Book {
  const book: Book = {
    id: result.id,
    title: result.title,
    author: result.author,
    coverUrl: result.coverUrl,
    totalPages: result.totalPages,
    genres: normalizeGenreList(result.genres),
    description: result.description,
  };
  if (result.publishedYear != null) book.publishedYear = result.publishedYear;
  if (result.averageRating != null) book.averageRating = result.averageRating;
  if (result.ratingsCount != null) book.ratingsCount = result.ratingsCount;
  return book;
}
