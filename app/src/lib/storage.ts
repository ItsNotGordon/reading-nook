import type {
  AppState,
  AppTheme,
  Book,
  BookId,
  BucketRankings,
  ProgressMode,
  SentimentBucket,
  Shelf,
  UserBook,
  UserProfile,
} from "./types";
import { APP_THEMES } from "./types";
import { SENTIMENT_BUCKETS, SHELVES } from "./types";
import { fractionToEstimatedRange, matchesCanonicalRange } from "./progress";
import { computeDerivedScores } from "./ranking";
import { normalizeGenreList } from "./genreNormalize";
export const STORAGE_KEY = "reading-nook-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShelf(value: unknown): value is Shelf {
  return typeof value === "string" && (SHELVES as string[]).includes(value);
}

function normalizeStoredSentiment(value: unknown): SentimentBucket | null {
  if (value === null || value === undefined) return null;
  if (value === "liked" || value === "okay" || value === "disliked") return value;
  // legacy 4-bucket mapping
  if (value === "loved") return "liked";
  if (value === "did_not_resonate") return "disliked";
  return null;
}

function isProgressMode(value: unknown): value is ProgressMode {
  return value === "exact" || value === "estimated";
}

function parseBook(value: unknown): Book | null {
  if (!isRecord(value)) return null;
  const {
    id,
    title,
    author,
    coverUrl,
    totalPages,
    genres,
    description,
    publishedYear,
    averageRating,
    ratingsCount,
    readinglogCount,
  } = value;
  if (typeof id !== "string" || typeof title !== "string" || typeof author !== "string") {
    return null;
  }
  const tp =
    typeof totalPages === "number" && Number.isFinite(totalPages) && totalPages >= 0
      ? Math.floor(totalPages)
      : 0;
  const g = Array.isArray(genres) && genres.every((x) => typeof x === "string") ? normalizeGenreList(genres) : [];
  const desc = typeof description === "string" ? description : "";
  const cover =
    typeof coverUrl === "string" && coverUrl.trim() !== ""
      ? coverUrl.trim()
      : "https://placehold.co/200x300/faf6ef/6b6560/png?text=Book";
  const book: Book = {
    id,
    title,
    author,
    coverUrl: cover,
    totalPages: tp,
    genres: g,
    description: desc,
  };
  if (typeof publishedYear === "number" && Number.isFinite(publishedYear)) {
    book.publishedYear = Math.round(publishedYear);
  }
  if (typeof averageRating === "number" && Number.isFinite(averageRating)) {
    book.averageRating = averageRating;
  }
  if (typeof ratingsCount === "number" && Number.isFinite(ratingsCount)) {
    book.ratingsCount = Math.floor(ratingsCount);
  }
  if (typeof readinglogCount === "number" && Number.isFinite(readinglogCount)) {
    book.readinglogCount = Math.floor(readinglogCount);
  }
  return book;
}

function parseEstimatedRange(raw: unknown): [number, number] | null {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const a = Number(raw[0]);
  const b = Number(raw[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return matchesCanonicalRange([a, b]);
}

function parseUserBook(value: unknown): UserBook | null {
  if (!isRecord(value)) return null;
  const {
    bookId,
    shelf,
    progressMode,
    currentPage,
    estimatedRange,
    estimatedFraction,
    finishedAt,
    finishedSortAt,
    sentimentBucket,
    derivedScore,
    addedAt,
    notes: notesField,
  } = value;
  if (typeof bookId !== "string" || !isShelf(shelf) || !isProgressMode(progressMode)) {
    return null;
  }
  if (
    currentPage !== null &&
    (typeof currentPage !== "number" || !Number.isFinite(currentPage))
  ) {
    return null;
  }

  let range: [number, number] | null = parseEstimatedRange(estimatedRange);

  const legacyFrac =
    estimatedFraction !== null &&
    typeof estimatedFraction === "number" &&
    Number.isFinite(estimatedFraction)
      ? estimatedFraction
      : null;
  if (range === null && legacyFrac !== null) {
    range = fractionToEstimatedRange(legacyFrac);
  }

  if (progressMode === "estimated" && range === null) {
    range = [0, 0.25];
  }
  if (progressMode === "exact") {
    range = null;
  }

  if (finishedAt !== null && typeof finishedAt !== "string") return null;
  if (finishedSortAt !== undefined && finishedSortAt !== null && typeof finishedSortAt !== "string") {
    return null;
  }
  const normalizedBucket = normalizeStoredSentiment(sentimentBucket);
  if (typeof addedAt !== "string") return null;
  const notes =
    typeof notesField === "string" ? notesField.slice(0, 8000) : "";
  if (
    derivedScore !== undefined &&
    derivedScore !== null &&
    (typeof derivedScore !== "number" || !Number.isFinite(derivedScore))
  ) {
    return null;
  }
  return {
    bookId,
    shelf,
    progressMode,
    currentPage: currentPage === null ? null : Math.floor(currentPage),
    estimatedRange: range,
    finishedAt,
    finishedSortAt:
      typeof finishedSortAt === "string"
        ? finishedSortAt
        : addedAt,
    sentimentBucket: normalizedBucket,
    derivedScore: typeof derivedScore === "number" && Number.isFinite(derivedScore) ? derivedScore : null,
    addedAt,
    notes,
  };
}

function normalizeHydratedUserBook(ub: UserBook, catalogEntry: Book | undefined): UserBook {
  const book = catalogEntry;

  let next: UserBook = { ...ub };

  // Non-finished shelves should not carry post-read metadata.
  if (next.shelf !== "finished" && (next.sentimentBucket !== null || next.derivedScore !== null)) {
    next = { ...next, sentimentBucket: null, derivedScore: null, finishedSortAt: null };
  }

  if (next.shelf === "finished") {
    if (next.progressMode === "estimated" && next.estimatedRange === null) {
      next = { ...next, estimatedRange: [1, 1] };
    }
    if (!next.finishedSortAt) {
      next = { ...next, finishedSortAt: next.addedAt };
    }
    return next;
  }

  if (next.shelf === "reading" && book && book.totalPages <= 0) {
    let er = next.estimatedRange;
    if (next.progressMode === "estimated") {
      if (!er) er = [0, 0.25];
    } else {
      er = er && matchesCanonicalRange(er) ? er : [0, 0.25];
    }
    const canon = er ? matchesCanonicalRange(er) ?? [0, 0.25] : ([0, 0.25] as [number, number]);
    next = {
      ...next,
      progressMode: "estimated",
      currentPage: null,
      estimatedRange: canon,
    };
    return next;
  }

  if (next.shelf === "reading" && book && book.totalPages > 0 && next.progressMode === "exact") {
    const max = book.totalPages;
    const cp = next.currentPage;
    const clamped = cp === null ? 1 : Math.min(max, Math.max(0, Math.floor(cp)));
    next = { ...next, currentPage: clamped, estimatedRange: null };
    return next;
  }

  if (next.shelf === "reading" && next.progressMode === "estimated" && next.estimatedRange) {
    const canon = matchesCanonicalRange(next.estimatedRange);
    if (canon) next = { ...next, estimatedRange: canon };
  }

  return next;
}

// parseBucketRankings removed: rankings are normalized explicitly in parseStoredState.

export function emptyRankings(): BucketRankings {
  return {
    liked: [],
    okay: [],
    disliked: [],
  };
}

const DEFAULT_DISPLAY_NAME = "Reading Nook Reader";
const DEFAULT_TAGLINE = "Curating stories, one cozy shelf at a time.";

export function defaultUserProfile(): UserProfile {
  return {
    displayName: DEFAULT_DISPLAY_NAME,
    tagline: DEFAULT_TAGLINE,
    theme: "plant",
  };
}

function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === "string" && (APP_THEMES as string[]).includes(value);
}

const PROFILE_DISPLAY_MAX = 80;
const PROFILE_TAGLINE_MAX = 200;

function parseProfile(value: unknown): UserProfile {
  const d = defaultUserProfile();
  if (!isRecord(value)) return d;
  const nameRaw = typeof value.displayName === "string" ? value.displayName.trim() : "";
  const tagRaw = typeof value.tagline === "string" ? value.tagline.trim() : "";
  const displayName = nameRaw
    ? nameRaw.slice(0, PROFILE_DISPLAY_MAX)
    : d.displayName;
  const tagline = tagRaw ? tagRaw.slice(0, PROFILE_TAGLINE_MAX) : d.tagline;
  const theme = isAppTheme(value.theme) ? value.theme : d.theme;
  return { displayName, tagline, theme };
}

/** Overlay `profiles` table name/tagline onto synced library state (server pull). */
export function applyProfileDbFields(
  state: AppState,
  displayName: string | null | undefined,
  tagline: string | null | undefined,
): AppState {
  const nameRaw = typeof displayName === "string" ? displayName.trim() : "";
  const tagRaw = typeof tagline === "string" ? tagline.trim() : "";
  if (!nameRaw && !tagRaw) return state;
  return {
    ...state,
    profile: {
      ...state.profile,
      ...(nameRaw ? { displayName: nameRaw.slice(0, PROFILE_DISPLAY_MAX) } : {}),
      ...(tagRaw ? { tagline: tagRaw.slice(0, PROFILE_TAGLINE_MAX) } : {}),
    },
  };
}

function parseDismissedRecIds(value: unknown): BookId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is BookId => typeof id === "string" && id.trim() !== "");
}

/** Default empty catalog and library; books are loaded from `public/data/books.json` in the Add flow. */
export function getInitialState(): AppState {
  return {
    version: 1,
    catalog: {},
    userBooks: {},
    bucketRankings: emptyRankings(),
    profile: defaultUserProfile(),
    dismissedRecIds: [],
  };
}

/**
 * Attempts to revive persisted JSON into `AppState`.
 * Returns `null` only when the string is not JSON or the root is not an object.
 * Unknown fields are ignored; invalid nested entries are dropped; rankings fall back to empty.
 * Catalog entries merge on top of `getInitialState()` (empty by default) so persisted titles stay available.
 */
export function parseStoredState(raw: string): AppState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed.version !== undefined && parsed.version !== 1) return null;

  const base = getInitialState();
  const catalog: Record<BookId, Book> = { ...base.catalog };

  if (isRecord(parsed.catalog)) {
    for (const [key, entry] of Object.entries(parsed.catalog)) {
      const book = parseBook(entry);
      if (book && book.id === key) catalog[key] = book;
    }
  }

  const userBooks: Partial<Record<BookId, UserBook>> = {};
  if (isRecord(parsed.userBooks)) {
    for (const [key, entry] of Object.entries(parsed.userBooks)) {
      const ub = parseUserBook(entry);
      if (ub && ub.bookId === key) {
        userBooks[key] = normalizeHydratedUserBook(ub, catalog[key]);
      }
    }
  }

  // Rankings: accept legacy keys and normalize to current buckets
  let rankings = emptyRankings();
  if (isRecord(parsed.bucketRankings)) {
    const liked = parsed.bucketRankings.liked;
    const okay = parsed.bucketRankings.okay;
    const loved = parsed.bucketRankings.loved;
    const did = parsed.bucketRankings.did_not_resonate;
    const disliked = parsed.bucketRankings.disliked;

    const pull = (v: unknown): BookId[] =>
      Array.isArray(v) && v.every((id) => typeof id === "string") ? (v as BookId[]) : [];

    // Merge legacy loved into liked, legacy did_not_resonate into disliked
    rankings = {
      liked: [...pull(liked), ...pull(loved)],
      okay: pull(okay),
      disliked: [...pull(disliked), ...pull(did)],
    };
  }

  // Recompute derived scores from rankings (source of truth)
  const nextUserBooks: Partial<Record<BookId, UserBook>> = { ...userBooks };
  for (const bucket of SENTIMENT_BUCKETS) {
    const ordered = rankings[bucket];
    const scores = computeDerivedScores(bucket, ordered);
    for (const id of ordered) {
      const ub = nextUserBooks[id];
      if (!ub) continue;
      nextUserBooks[id] = { ...ub, sentimentBucket: bucket, derivedScore: scores[id] ?? null };
    }
  }

  const profile = parseProfile(parsed.profile);
  const dismissedRecIds = parseDismissedRecIds(parsed.dismissedRecIds);

  return {
    version: 1,
    catalog,
    userBooks: nextUserBooks,
    bucketRankings: rankings,
    profile,
    dismissedRecIds,
  };
}

export function loadState(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === "") return null;
    return parseStoredState(raw);
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore */
  }
}
