/**
 * Reading Nook canonical genre vocabulary for Open Library subject mapping.
 * Display labels are title-case; matching uses {@link segmentKey}.
 */

/** User-facing genre labels (~30–50). */
export const ACCEPTED_GENRES = [
  "Adventure",
  "American literature",
  "Biography",
  "British fiction",
  "Chick lit",
  "Classics",
  "Comics",
  "Coming of age",
  "Cooking",
  "Creative",
  "Crime",
  "Drama",
  "Dystopian",
  "English fiction",
  "English literature",
  "Family fiction",
  "Fantasy",
  "Fiction",
  "Historical fiction",
  "History",
  "Horror",
  "Humor",
  "Literary fiction",
  "Manga",
  "Memoir",
  "Mystery",
  "Non-fiction",
  "Paranormal",
  "Poetry",
  "Regency romance",
  "Romance",
  "Science fiction",
  "Sports",
  "Suspense",
  "Thriller",
  "War",
  "Western",
  "Young adult",
] as const;

export type AcceptedGenre = (typeof ACCEPTED_GENRES)[number];

const ACCEPTED_GENRE_SET = new Set<string>(ACCEPTED_GENRES);

/** Normalize segment / label text for lookup (OL BISAC, LOC, plain subjects). */
export function segmentKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[''`'']/g, "")
    .replace(/&/g, " and ")
    .replace(/[_\-/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function acceptedGenreKey(label: string): string {
  return segmentKey(label);
}

export function isAcceptedGenre(label: string): boolean {
  return ACCEPTED_GENRE_SET.has(label);
}

/** LOC / OL theme words → canonical genre (only when confident). */
export const THEME_TO_GENRE = new Map<string, AcceptedGenre>([
  ["death", "Horror"],
  ["murder", "Mystery"],
  ["revenge", "Thriller"],
  ["ghost", "Paranormal"],
  ["ghosts", "Paranormal"],
  ["vampire", "Paranormal"],
  ["vampires", "Paranormal"],
  ["zombie", "Horror"],
  ["zombies", "Horror"],
]);

type SegmentEntry = readonly [string, AcceptedGenre];

/** Normalized segment text → canonical display label. */
const SEGMENT_ENTRIES: readonly SegmentEntry[] = [
  // Notebook / Goodreads core
  ["fantasy", "Fantasy"],
  ["romance", "Romance"],
  ["mystery", "Mystery"],
  ["science fiction", "Science fiction"],
  ["science-fiction", "Science fiction"],
  ["sci fi", "Science fiction"],
  ["sci-fi", "Science fiction"],
  ["young adult", "Young adult"],
  ["young-adult", "Young adult"],
  ["historical fiction", "Historical fiction"],
  ["historical-fiction", "Historical fiction"],
  ["nonfiction", "Non-fiction"],
  ["non-fiction", "Non-fiction"],
  ["non fiction", "Non-fiction"],
  ["paranormal", "Paranormal"],
  ["horror", "Horror"],
  ["graphic novels", "Comics"],
  ["graphic novel", "Comics"],
  ["graphic-novels", "Comics"],
  ["graphic-novel", "Comics"],
  ["comics", "Comics"],
  ["manga", "Manga"],
  ["fiction", "Fiction"],
  // BISAC audience roots
  ["juvenile fiction", "Young adult"],
  ["juvenile nonfiction", "Non-fiction"],
  ["juvenile non fiction", "Non-fiction"],
  ["young adult fiction", "Young adult"],
  ["young adult nonfiction", "Non-fiction"],
  ["young adult non fiction", "Non-fiction"],
  ["children's fiction", "Young adult"],
  ["childrens fiction", "Young adult"],
  ["children fiction", "Young adult"],
  // BISAC genre segments
  ["action and adventure", "Adventure"],
  ["action adventure", "Adventure"],
  ["adventure", "Adventure"],
  ["adventure fiction", "Adventure"],
  ["thriller", "Thriller"],
  ["thrillers", "Thriller"],
  ["suspense", "Suspense"],
  ["crime", "Crime"],
  ["crime fiction", "Crime"],
  ["detective", "Mystery"],
  ["detective fiction", "Mystery"],
  ["historical", "Historical fiction"],
  ["regency", "Regency romance"],
  ["regency romance", "Regency romance"],
  ["literary", "Literary fiction"],
  ["literary fiction", "Literary fiction"],
  ["dystopian", "Dystopian"],
  ["dystopia", "Dystopian"],
  ["dystopias", "Dystopian"],
  ["coming of age", "Coming of age"],
  ["family life", "Family fiction"],
  ["family fiction", "Family fiction"],
  ["domestic fiction", "Family fiction"],
  ["classical literature", "Classics"],
  ["classics", "Classics"],
  ["classic literature", "Classics"],
  ["biography", "Biography"],
  ["biographies", "Biography"],
  ["autobiography", "Memoir"],
  ["autobiographies", "Memoir"],
  ["memoir", "Memoir"],
  ["memoirs", "Memoir"],
  ["poetry", "Poetry"],
  ["drama", "Drama"],
  ["humor", "Humor"],
  ["humour", "Humor"],
  ["sports", "Sports"],
  ["sport", "Sports"],
  ["war", "War"],
  ["war fiction", "War"],
  ["western", "Western"],
  ["westerns", "Western"],
  ["western fiction", "Western"],
  ["cooking", "Cooking"],
  ["cookbooks", "Cooking"],
  ["history", "History"],
  ["american literature", "American literature"],
  ["english literature", "English literature"],
  ["english fiction", "English fiction"],
  ["british fiction", "British fiction"],
  ["british and irish fiction", "British fiction"],
  ["chick lit", "Chick lit"],
  ["chic lit", "Chick lit"],
  // OL phrase patterns (migrated from openLibrarySubjects overrides)
  ["fantasy fiction", "Fantasy"],
  ["romance fiction", "Romance"],
  ["fiction romance general", "Romance"],
  ["fiction romance historical", "Romance"],
  ["fiction romance historical general", "Romance"],
  ["fiction romance historical regency", "Regency romance"],
  ["fiction science fiction general", "Science fiction"],
  ["fiction coming of age", "Coming of age"],
  ["fiction family life", "Family fiction"],
  ["fiction family life general", "Family fiction"],
  ["man woman relationships fiction", "Romance"],
  ["young women fiction", "Young adult"],
  ["sisters fiction", "Family fiction"],
  ["women fiction", "Literary fiction"],
  ["american science fiction", "Science fiction"],
  ["ecology", "Science fiction"],
  ["brothers and sisters", "Family fiction"],
  ["courtship", "Romance"],
];

export const CANONICAL_BY_SEGMENT_KEY = new Map<string, AcceptedGenre>(
  SEGMENT_ENTRIES.map(([k, v]) => [segmentKey(k), v]),
);

export function canonicalForSegment(segment: string): AcceptedGenre | null {
  const key = segmentKey(segment);
  if (!key) return null;
  return CANONICAL_BY_SEGMENT_KEY.get(key) ?? null;
}

/** Map a user search string to a canonical genre label when it is an exact or unique match. */
export function resolveCanonicalGenreFromQuery(query: string): AcceptedGenre | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  if (isAcceptedGenre(trimmed)) return trimmed as AcceptedGenre;

  const fromSegment = canonicalForSegment(trimmed);
  if (fromSegment) return fromSegment;

  const q = segmentKey(trimmed);
  for (const label of ACCEPTED_GENRES) {
    if (segmentKey(label) === q) return label;
  }

  const partial = ACCEPTED_GENRES.filter((label) => segmentKey(label).includes(q));
  if (partial.length === 1) return partial[0];
  return null;
}
