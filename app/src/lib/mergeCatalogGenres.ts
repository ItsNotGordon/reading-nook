import { normalizeGenreList } from "@/lib/genreNormalize";
import { isAcceptedGenre } from "@/lib/genreVocabulary";

export const MAX_CATALOG_GENRES = 6;

/** Merge Open Library / catalog genres with user-picked labels (allowlist only). */
export function mergeCatalogGenres(
  base: readonly string[],
  userPicked: readonly string[],
  max = MAX_CATALOG_GENRES,
): string[] {
  const allowed = [...base, ...userPicked].filter((g) => isAcceptedGenre(g));
  return normalizeGenreList(allowed).slice(0, max);
}

/** Normalize user-selected genres for catalog storage (edit flow). */
export function sanitizeCatalogGenres(genres: readonly string[]): string[] {
  const allowed = genres.filter((g) => isAcceptedGenre(g));
  return normalizeGenreList(allowed).slice(0, MAX_CATALOG_GENRES);
}
