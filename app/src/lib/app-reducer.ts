import type {
  AppState,
  AppTheme,
  Book,
  BookVisibility,
  BookId,
  BucketRankings,
  SentimentBucket,
  Shelf,
  UserBook,
} from "./types";
import { SENTIMENT_BUCKETS } from "./types";
import { matchesCanonicalRange } from "./progress";
import { computeDerivedScores } from "./ranking";
import { sanitizeCatalogGenres } from "./mergeCatalogGenres";
import { reconcileRankingsState } from "./libraryRankings";
import { getInitialState, defaultUserProfile } from "./storage";

export type AppAction =
  | { type: "HYDRATE"; payload: AppState }
  | { type: "RESET_LIBRARY" }
  | { type: "RESET_SESSION" }
  | { type: "ADD_BOOK_TO_SHELF"; bookId: BookId; shelf: Shelf; catalogBook?: Book }
  | { type: "MOVE_BOOK_TO_SHELF"; bookId: BookId; shelf: Shelf }
  | { type: "SET_USER_BOOK_VISIBILITY"; bookId: BookId; visibility: BookVisibility }
  | { type: "UPDATE_EXACT_PROGRESS"; bookId: BookId; currentPage: number }
  | {
      type: "UPDATE_READING_EXACT_PROGRESS";
      bookId: BookId;
      totalPages: number;
      currentPage: number;
    }
  | { type: "UPDATE_ESTIMATED_PROGRESS"; bookId: BookId; estimatedRange: [number, number] }
  | { type: "MARK_FINISHED"; bookId: BookId }
  | { type: "REMOVE_USER_BOOK"; bookId: BookId }
  | { type: "UPDATE_FINISHED_AT"; bookId: BookId; finishedAt: string }
  | { type: "UPDATE_ADDED_AT"; bookId: BookId; addedAt: string }
  | { type: "SET_SENTIMENT_BUCKET"; bookId: BookId; sentimentBucket: SentimentBucket | null }
  | { type: "INSERT_BOOK_INTO_BUCKET_AT_INDEX"; bookId: BookId; bucket: SentimentBucket; index: number }
  | {
      type: "UPDATE_BUCKET_RANKINGS";
      bucket: SentimentBucket;
      orderedBookIds: BookId[];
    }
  | { type: "UPDATE_USER_BOOK_NOTES"; bookId: BookId; notes: string }
  | { type: "UPDATE_CATALOG_GENRES"; bookId: BookId; genres: string[] }
  | { type: "UPDATE_PROFILE"; displayName?: string; tagline?: string; theme?: AppTheme }
  | { type: "DISMISS_REC"; bookId: BookId; catalogBook?: Book }
  | { type: "ADD_BLACKLIST_WORD"; word: string }
  | { type: "REMOVE_BLACKLIST_WORD"; word: string }
  | { type: "RESTORE_DISMISSED_REC"; bookId: BookId }
  | { type: "RESTORE_ALL_DISMISSED_RECS" };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function applyReadingExactProgress(
  state: AppState,
  bookId: BookId,
  totalPages: number,
  currentPage: number,
): AppState {
  const ub = state.userBooks[bookId];
  const book = state.catalog[bookId];
  if (!ub || !book || ub.shelf !== "reading") return state;
  const tp = Math.max(1, Math.floor(totalPages));
  const page = clamp(Math.floor(currentPage), 0, tp);
  return {
    ...state,
    catalog: {
      ...state.catalog,
      [bookId]: { ...book, totalPages: tp },
    },
    userBooks: {
      ...state.userBooks,
      [bookId]: {
        ...ub,
        progressMode: "exact",
        currentPage: page,
        estimatedRange: null,
      },
    },
  };
}

function defaultUserBook(bookId: BookId, shelf: Shelf, totalPages: number): UserBook {
  if (totalPages > 0) {
    return {
      bookId,
      shelf,
      visibility: "public",
      progressMode: "exact",
      currentPage: 1,
      estimatedRange: null,
      finishedAt: null,
      finishedSortAt: null,
      sentimentBucket: null,
      derivedScore: null,
      addedAt: new Date().toISOString(),
      notes: "",
    };
  }
  return {
    bookId,
    shelf,
    visibility: "public",
    progressMode: "estimated",
    currentPage: null,
    estimatedRange: [0, 0.25],
    finishedAt: null,
    finishedSortAt: null,
    sentimentBucket: null,
    derivedScore: null,
    addedAt: new Date().toISOString(),
    notes: "",
  };
}

function snapFinishedProgress(
  ub: UserBook,
  totalPages: number,
): Pick<UserBook, "progressMode" | "currentPage" | "estimatedRange" | "finishedAt" | "finishedSortAt" | "shelf"> {
  const finishedAt = new Date().toISOString();
  if (ub.progressMode === "estimated") {
    return {
      shelf: "finished",
      progressMode: "estimated",
      currentPage: null,
      estimatedRange: [1, 1],
      finishedAt,
      finishedSortAt: finishedAt,
    };
  }
  return {
    shelf: "finished",
    progressMode: "exact",
    currentPage: totalPages > 0 ? totalPages : 0,
    estimatedRange: null,
    finishedAt,
    finishedSortAt: finishedAt,
  };
}

function removeBookFromRankings(
  rankings: BucketRankings,
  bookId: BookId,
): BucketRankings {
  const next: BucketRankings = { ...rankings };
  for (const b of SENTIMENT_BUCKETS) {
    next[b] = rankings[b].filter((id) => id !== bookId);
  }
  return next;
}

function appendUnique(rankings: BucketRankings, bucket: SentimentBucket, bookId: BookId): BucketRankings {
  const cleaned = removeBookFromRankings(rankings, bookId);
  return {
    ...cleaned,
    [bucket]: [...cleaned[bucket], bookId],
  };
}

function applyDerivedScoresToUserBooks(
  userBooks: Partial<Record<BookId, UserBook>>,
  bucket: SentimentBucket,
  orderedBookIds: BookId[],
): Partial<Record<BookId, UserBook>> {
  const scores = computeDerivedScores(bucket, orderedBookIds);
  const next = { ...userBooks };
  for (const id of orderedBookIds) {
    const ub = next[id];
    if (!ub) continue;
    next[id] = { ...ub, derivedScore: scores[id] ?? null };
  }
  return next;
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "HYDRATE": {
      const hydrated = reconcileRankingsState({
        ...action.payload,
        profile: action.payload.profile ?? defaultUserProfile(),
        dismissedRecIds: action.payload.dismissedRecIds ?? [],
        blacklistedTitleWords: action.payload.blacklistedTitleWords ?? [],
      });
      return hydrated;
    }

    case "RESET_LIBRARY":
      // Clear shelves and cached catalog only; keep presenter profile for class demos.
      return { ...getInitialState(), profile: state.profile };

    case "RESET_SESSION":
      return getInitialState();

    case "UPDATE_PROFILE": {
      const d = defaultUserProfile();
      let displayName = state.profile.displayName;
      let tagline = state.profile.tagline;
      let theme: AppTheme = state.profile.theme ?? d.theme;
      if (action.displayName !== undefined) {
        const t = action.displayName.trim().slice(0, 80);
        displayName = t || d.displayName;
      }
      if (action.tagline !== undefined) {
        const t = action.tagline.trim().slice(0, 200);
        tagline = t || d.tagline;
      }
      if (action.theme !== undefined) {
        theme = action.theme;
      }
      return {
        ...state,
        profile: { displayName, tagline, theme },
      };
    }

    case "DISMISS_REC": {
      if (state.dismissedRecIds.includes(action.bookId)) return state;
      let catalog = state.catalog;
      if (action.catalogBook && action.catalogBook.id === action.bookId && !catalog[action.bookId]) {
        catalog = { ...catalog, [action.bookId]: action.catalogBook };
      }
      return { ...state, catalog, dismissedRecIds: [...state.dismissedRecIds, action.bookId] };
    }

    case "ADD_BLACKLIST_WORD": {
      const word = action.word.trim();
      if (!word || state.blacklistedTitleWords.includes(word)) return state;
      return { ...state, blacklistedTitleWords: [...state.blacklistedTitleWords, word] };
    }

    case "REMOVE_BLACKLIST_WORD": {
      return {
        ...state,
        blacklistedTitleWords: state.blacklistedTitleWords.filter((w) => w !== action.word),
      };
    }

    case "RESTORE_DISMISSED_REC": {
      if (!state.dismissedRecIds.includes(action.bookId)) return state;
      return {
        ...state,
        dismissedRecIds: state.dismissedRecIds.filter((id) => id !== action.bookId),
      };
    }

    case "RESTORE_ALL_DISMISSED_RECS": {
      if (state.dismissedRecIds.length === 0) return state;
      return { ...state, dismissedRecIds: [] };
    }

    case "ADD_BOOK_TO_SHELF": {
      let catalog = state.catalog;
      if (
        !catalog[action.bookId] &&
        action.catalogBook &&
        action.catalogBook.id === action.bookId
      ) {
        catalog = { ...state.catalog, [action.bookId]: action.catalogBook };
      }
      const book = catalog[action.bookId];
      if (!book) return state;

      const existing = state.userBooks[action.bookId];
      if (existing) {
        const baseState = catalog !== state.catalog ? { ...state, catalog } : state;
        return appReducer(baseState, {
          type: "MOVE_BOOK_TO_SHELF",
          bookId: action.bookId,
          shelf: action.shelf,
        });
      }

      const base = defaultUserBook(action.bookId, action.shelf, book.totalPages);
      const userBook: UserBook =
        action.shelf === "finished"
          ? { ...base, ...snapFinishedProgress(base, book.totalPages) }
          : base;

      return {
        ...state,
        catalog,
        userBooks: { ...state.userBooks, [action.bookId]: userBook },
      };
    }

    case "MOVE_BOOK_TO_SHELF": {
      const ub = state.userBooks[action.bookId];
      const book = state.catalog[action.bookId];
      if (!ub || !book) return state;
      const shelf = action.shelf;
      let nextUb: UserBook = { ...ub, shelf };
      let rankings = state.bucketRankings;

      if (shelf === "finished") {
        nextUb = { ...ub, ...snapFinishedProgress(ub, book.totalPages) };
      } else {
        nextUb = {
          ...nextUb,
          finishedAt: null,
          finishedSortAt: null,
          sentimentBucket: null,
          derivedScore: null,
        };
        rankings = removeBookFromRankings(rankings, action.bookId);
        if (shelf === "reading") {
          if (book.totalPages > 0) {
            const prevPage =
              ub.progressMode === "exact" && ub.currentPage !== null
                ? ub.currentPage
                : undefined;
            const max = book.totalPages;
            nextUb = {
              ...nextUb,
              progressMode: "exact",
              currentPage: Math.min(
                max,
                Math.max(1, prevPage !== undefined ? Math.floor(prevPage) : 1),
              ),
              estimatedRange: null,
            };
          } else if (nextUb.progressMode === "estimated" && nextUb.estimatedRange) {
            /* keep estimate */
          } else {
            nextUb = {
              ...nextUb,
              progressMode: "estimated",
              currentPage: null,
              estimatedRange: [0, 0.25],
            };
          }
        }
      }

      return {
        ...state,
        userBooks: { ...state.userBooks, [action.bookId]: nextUb },
        bucketRankings: rankings,
      };
    }

    case "SET_USER_BOOK_VISIBILITY": {
      const ub = state.userBooks[action.bookId];
      if (!ub) return state;
      if (ub.visibility === action.visibility) return state;
      return {
        ...state,
        userBooks: {
          ...state.userBooks,
          [action.bookId]: { ...ub, visibility: action.visibility },
        },
      };
    }

    case "UPDATE_EXACT_PROGRESS": {
      const book = state.catalog[action.bookId];
      if (!book || book.totalPages <= 0) return state;
      return applyReadingExactProgress(
        state,
        action.bookId,
        book.totalPages,
        action.currentPage,
      );
    }

    case "UPDATE_READING_EXACT_PROGRESS": {
      return applyReadingExactProgress(
        state,
        action.bookId,
        action.totalPages,
        action.currentPage,
      );
    }

    case "UPDATE_ESTIMATED_PROGRESS": {
      const ub = state.userBooks[action.bookId];
      if (!ub || ub.shelf !== "reading") return state;
      const canonical = matchesCanonicalRange(action.estimatedRange);
      if (!canonical) return state;
      return {
        ...state,
        userBooks: {
          ...state.userBooks,
          [action.bookId]: {
            ...ub,
            progressMode: "estimated",
            currentPage: null,
            estimatedRange: canonical,
          },
        },
      };
    }

    case "MARK_FINISHED": {
      const ub = state.userBooks[action.bookId];
      const book = state.catalog[action.bookId];
      if (!ub || !book) return state;
      return {
        ...state,
        userBooks: {
          ...state.userBooks,
          [action.bookId]: { ...ub, ...snapFinishedProgress(ub, book.totalPages) },
        },
      };
    }

    case "REMOVE_USER_BOOK": {
      if (!state.userBooks[action.bookId]) return state;

      const affectedBuckets = new Set<SentimentBucket>();
      for (const b of SENTIMENT_BUCKETS) {
        if (state.bucketRankings[b].includes(action.bookId)) affectedBuckets.add(b);
      }

      const bucketRankings = removeBookFromRankings(state.bucketRankings, action.bookId);
      const userBooks: Partial<Record<BookId, UserBook>> = { ...state.userBooks };
      delete userBooks[action.bookId];

      // Recompute derived scores for any bucket whose ordering changed.
      for (const b of affectedBuckets) {
        const ordered = bucketRankings[b];
        const scores = computeDerivedScores(b, ordered);
        for (const id of ordered) {
          const prev = userBooks[id];
          if (!prev) continue;
          userBooks[id] = { ...prev, sentimentBucket: b, derivedScore: scores[id] ?? null };
        }
      }

      return {
        ...state,
        userBooks,
        bucketRankings,
      };
    }

    case "UPDATE_FINISHED_AT": {
      const ub = state.userBooks[action.bookId];
      if (!ub || ub.shelf !== "finished") return state;
      const nowIso = new Date().toISOString();
      return {
        ...state,
        userBooks: {
          ...state.userBooks,
          [action.bookId]: { ...ub, finishedAt: action.finishedAt, finishedSortAt: nowIso },
        },
      };
    }

    case "UPDATE_ADDED_AT": {
      const ub = state.userBooks[action.bookId];
      if (!ub) return state;
      return {
        ...state,
        userBooks: {
          ...state.userBooks,
          [action.bookId]: { ...ub, addedAt: action.addedAt },
        },
      };
    }

    case "SET_SENTIMENT_BUCKET": {
      const ub = state.userBooks[action.bookId];
      if (!ub || ub.shelf !== "finished") return state;
      const sentimentBucket = action.sentimentBucket;
      let rankings = state.bucketRankings;
      let userBooks = {
        ...state.userBooks,
        [action.bookId]: {
          ...ub,
          sentimentBucket,
          derivedScore: null,
          finishedSortAt: sentimentBucket ? new Date().toISOString() : ub.finishedSortAt,
        },
      };

      if (sentimentBucket === null) {
        rankings = removeBookFromRankings(rankings, action.bookId);
        return { ...state, userBooks, bucketRankings: rankings };
      }

      rankings = appendUnique(rankings, sentimentBucket, action.bookId);
      userBooks = applyDerivedScoresToUserBooks(userBooks, sentimentBucket, rankings[sentimentBucket]);
      return { ...state, userBooks, bucketRankings: rankings };
    }

    case "INSERT_BOOK_INTO_BUCKET_AT_INDEX": {
      const { bookId, bucket, index } = action;
      const ub = state.userBooks[bookId];
      if (!ub) return state;
      const nowIso = new Date().toISOString();

      // Remove the book from all buckets first, then insert it into the target bucket at the computed index.
      const affectedBuckets = new Set<SentimentBucket>();
      const nextRankings: BucketRankings = { ...state.bucketRankings };
      for (const b of SENTIMENT_BUCKETS) {
        if (nextRankings[b].includes(bookId)) affectedBuckets.add(b);
        nextRankings[b] = nextRankings[b].filter((id) => id !== bookId);
      }
      affectedBuckets.add(bucket);

      const targetArr = nextRankings[bucket];
      const safeIndex = clamp(Math.floor(index), 0, targetArr.length);
      const nextTarget = [...targetArr];
      nextTarget.splice(safeIndex, 0, bookId);
      nextRankings[bucket] = nextTarget;

      // Recompute derived scores for any bucket whose ordering changed (old bucket + target bucket).
      const nextUserBooks: Partial<Record<BookId, UserBook>> = { ...state.userBooks };
      if (nextUserBooks[bookId]) {
        nextUserBooks[bookId] = {
          ...nextUserBooks[bookId],
          shelf: "finished",
          sentimentBucket: bucket,
          finishedSortAt: nowIso,
        };
      }
      for (const b of affectedBuckets) {
        const ordered = nextRankings[b];
        const scores = computeDerivedScores(b, ordered);
        for (const id of ordered) {
          const prev = nextUserBooks[id];
          if (!prev) continue;
          nextUserBooks[id] = { ...prev, sentimentBucket: b, derivedScore: scores[id] ?? null };
        }
      }

      return {
        ...state,
        bucketRankings: nextRankings,
        userBooks: nextUserBooks,
      };
    }

    case "UPDATE_BUCKET_RANKINGS": {
      const { bucket, orderedBookIds } = action;
      const seen = new Set<BookId>();
      const filtered: BookId[] = [];
      for (const id of orderedBookIds) {
        const ub = state.userBooks[id];
        if (!ub || ub.sentimentBucket !== bucket) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        filtered.push(id);
      }
      const nextRankings = {
        ...state.bucketRankings,
        [bucket]: filtered,
      };
      const nextUserBooks = applyDerivedScoresToUserBooks(
        state.userBooks,
        bucket,
        filtered,
      );
      return {
        ...state,
        bucketRankings: nextRankings,
        userBooks: nextUserBooks,
      };
    }

    case "UPDATE_USER_BOOK_NOTES": {
      const ub = state.userBooks[action.bookId];
      if (!ub) return state;
      const nextNotes =
        action.notes.length > 8000 ? action.notes.slice(0, 8000) : action.notes;
      return {
        ...state,
        userBooks: {
          ...state.userBooks,
          [action.bookId]: { ...ub, notes: nextNotes },
        },
      };
    }

    case "UPDATE_CATALOG_GENRES": {
      const book = state.catalog[action.bookId];
      if (!book) return state;
      return {
        ...state,
        catalog: {
          ...state.catalog,
          [action.bookId]: {
            ...book,
            genres: sanitizeCatalogGenres(action.genres),
          },
        },
      };
    }

    default:
      return state;
  }
}
