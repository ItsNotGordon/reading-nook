import { normalizeGenreList } from "@/lib/genreNormalize";
import {
  mapSegmentsToCanonical,
  tokenizeOpenLibrarySubject,
} from "@/lib/bookProviders/openLibraryBisac";

export const OPEN_LIBRARY_MAX_GENRES = 6;

const DROP_PREFIXES = ["award:", "nyt:"];

const DROP_CONTAINS = [
  "(fictitious character)",
  "(fictional works by one author)",
  "(imaginary place)",
];

const DROP_STARTS_WITH = ["reading level-"];

/** Whole subject line dropped before splitting (metadata blobs). */
const DROP_WHOLE_PATTERN =
  /^(language and languages|readers|textbooks for foreign speakers|coloring books|large type books|roman anglais|prophecies|emoticons|художественная литература)/i;

function shouldDropWholeSubject(raw: string): boolean {
  const t = raw.trim();
  if (!t || t.length > 120) return true;
  if (DROP_WHOLE_PATTERN.test(t)) return true;
  const lower = t.toLowerCase();
  if (DROP_PREFIXES.some((p) => lower.startsWith(p))) return true;
  if (DROP_CONTAINS.some((p) => lower.includes(p))) return true;
  if (DROP_STARTS_WITH.some((p) => lower.startsWith(p))) return true;
  return false;
}

const FICTION_LIKE_GENRES = new Set([
  "Adventure",
  "British fiction",
  "Chick lit",
  "Coming of age",
  "Crime",
  "Dystopian",
  "English fiction",
  "Family fiction",
  "Fantasy",
  "Fiction",
  "Historical fiction",
  "Horror",
  "Literary fiction",
  "Manga",
  "Mystery",
  "Paranormal",
  "Regency romance",
  "Romance",
  "Science fiction",
  "Suspense",
  "Thriller",
  "War",
  "Western",
  "Young adult",
]);

function hasFictionLikeGenre(genres: readonly string[]): boolean {
  return genres.some(
    (g) =>
      FICTION_LIKE_GENRES.has(g) ||
      (g !== "Non-fiction" && g.toLowerCase().includes("fiction")),
  );
}

function processSubject(raw: string): string[] {
  if (shouldDropWholeSubject(raw)) return [];
  const { segments, fictionSignal } = tokenizeOpenLibrarySubject(raw);
  const mapped = mapSegmentsToCanonical(segments);
  if (fictionSignal && !hasFictionLikeGenre(mapped)) {
    return [...mapped, "Fiction"];
  }
  return mapped;
}

/**
 * Map Open Library `subject` strings to display genres for Reading Nook.
 */
export function parseOpenLibrarySubjects(subjects: readonly string[]): string[] {
  const candidates: string[] = [];
  for (const raw of subjects) {
    if (!raw || typeof raw !== "string") continue;
    candidates.push(...processSubject(raw));
  }
  return normalizeGenreList(candidates).slice(0, OPEN_LIBRARY_MAX_GENRES);
}
