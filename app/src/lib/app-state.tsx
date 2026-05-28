"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { appReducer } from "./app-reducer";
import { bookHasBucketRanking } from "./libraryRankings";
import { APP_THEMES, type AppState, type Book, type BookId, type BookVisibility, type SentimentBucket, type Shelf, type UserProfile } from "./types";
import { getInitialState, loadState, saveState } from "./storage";
import { postFeedEvent, debouncedPostFeedEvent } from "./feedClient";

export type ReadingNookActions = {
  addBookToShelf: (bookId: BookId, shelf: Shelf, catalogBook?: Book) => void;
  moveBookToShelf: (bookId: BookId, shelf: Shelf) => void;
  setUserBookVisibility: (bookId: BookId, visibility: BookVisibility) => void;
  updateExactProgress: (bookId: BookId, currentPage: number) => void;
  updateReadingExactProgress: (
    bookId: BookId,
    totalPages: number,
    currentPage: number,
  ) => void;
  updateEstimatedProgress: (bookId: BookId, estimatedRange: [number, number]) => void;
  markFinished: (bookId: BookId) => void;
  removeUserBook: (bookId: BookId) => void;
  updateFinishedAt: (bookId: BookId, finishedAt: string) => void;
  updateAddedAt: (bookId: BookId, addedAt: string) => void;
  setSentimentBucket: (bookId: BookId, sentimentBucket: SentimentBucket | null) => void;
  insertBookIntoBucketAtIndex: (bookId: BookId, bucket: SentimentBucket, index: number) => void;
  updateBucketRankings: (bucket: SentimentBucket, orderedBookIds: BookId[]) => void;
  /** Wipe shelves, rankings, and cached catalog copies (localStorage only). */
  resetLibrary: () => void;
  /** Full local reset including profile (sign-out / account isolation). */
  resetSession: () => void;
  /** Replace library from backup file or cloud sync. */
  hydrateLibrary: (next: AppState) => void;
  updateUserBookNotes: (bookId: BookId, notes: string) => void;
  updateCatalogGenres: (bookId: BookId, genres: string[]) => void;
  updateProfile: (patch: Partial<Pick<UserProfile, "displayName" | "tagline" | "theme">>) => void;
  dismissRec: (bookId: BookId, catalogBook?: Book) => void;
  addBlacklistWord: (word: string) => void;
  removeBlacklistWord: (word: string) => void;
  restoreDismissedRec: (bookId: BookId) => void;
  restoreAllDismissedRecs: () => void;
};

type ReadingNookContextValue = {
  state: AppState;
  actions: ReadingNookActions;
  /** True once localStorage state has been loaded (avoids SSR hydration mismatch). */
  ready: boolean;
};

const ReadingNookContext = createContext<ReadingNookContextValue | null>(null);

export function ReadingNookProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      dispatch({ type: "HYDRATE", payload: loaded });
    } else {
      const randomTheme = APP_THEMES[Math.floor(Math.random() * APP_THEMES.length)];
      dispatch({ type: "UPDATE_PROFILE", theme: randomTheme });
    }
    queueMicrotask(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState(state);
  }, [state, ready]);

  const actions = useMemo<ReadingNookActions>(
    () => ({
      addBookToShelf: (bookId, shelf, catalogBook) => {
        dispatch({ type: "ADD_BOOK_TO_SHELF", bookId, shelf, catalogBook });
        if (catalogBook) {
          postFeedEvent({
            eventType: "shelved",
            bookId,
            bookTitle: catalogBook.title,
            bookAuthor: catalogBook.author,
            bookCoverUrl: catalogBook.coverUrl,
            shelf,
          });
        }
      },
      moveBookToShelf: (bookId, shelf) => {
        dispatch({ type: "MOVE_BOOK_TO_SHELF", bookId, shelf });
      },
      setUserBookVisibility: (bookId, visibility) => {
        dispatch({ type: "SET_USER_BOOK_VISIBILITY", bookId, visibility });
      },
      updateExactProgress: (bookId, currentPage) => {
        dispatch({ type: "UPDATE_EXACT_PROGRESS", bookId, currentPage });
        const cat = stateRef.current.catalog[bookId];
        if (cat && cat.totalPages > 0) {
          const fraction = Math.min(1, currentPage / cat.totalPages);
          debouncedPostFeedEvent({
            eventType: "progress",
            bookId,
            bookTitle: cat.title,
            bookAuthor: cat.author,
            bookCoverUrl: cat.coverUrl,
            shelf: "reading",
            derivedScore: fraction,
          });
        }
      },
      updateReadingExactProgress: (bookId, totalPages, currentPage) => {
        dispatch({ type: "UPDATE_READING_EXACT_PROGRESS", bookId, totalPages, currentPage });
        if (totalPages > 0) {
          const cat = stateRef.current.catalog[bookId];
          if (cat) {
            const fraction = Math.min(1, currentPage / totalPages);
            debouncedPostFeedEvent({
              eventType: "progress",
              bookId,
              bookTitle: cat.title,
              bookAuthor: cat.author,
              bookCoverUrl: cat.coverUrl,
              shelf: "reading",
              derivedScore: fraction,
            });
          }
        }
      },
      updateEstimatedProgress: (bookId, estimatedRange) => {
        dispatch({ type: "UPDATE_ESTIMATED_PROGRESS", bookId, estimatedRange });
        const cat = stateRef.current.catalog[bookId];
        if (cat) {
          const mid = (estimatedRange[0] + estimatedRange[1]) / 2;
          debouncedPostFeedEvent({
            eventType: "progress",
            bookId,
            bookTitle: cat.title,
            bookAuthor: cat.author,
            bookCoverUrl: cat.coverUrl,
            shelf: "reading",
            derivedScore: mid,
          });
        }
      },
      markFinished: (bookId) => {
        dispatch({ type: "MARK_FINISHED", bookId });
        const cat = stateRef.current.catalog[bookId];
        if (cat) {
          postFeedEvent({
            eventType: "finished",
            bookId,
            bookTitle: cat.title,
            bookAuthor: cat.author,
            bookCoverUrl: cat.coverUrl,
            shelf: "finished",
          });
        }
      },
      removeUserBook: (bookId) => dispatch({ type: "REMOVE_USER_BOOK", bookId }),
      updateFinishedAt: (bookId, finishedAt) =>
        dispatch({ type: "UPDATE_FINISHED_AT", bookId, finishedAt }),
      updateAddedAt: (bookId, addedAt) =>
        dispatch({ type: "UPDATE_ADDED_AT", bookId, addedAt }),
      setSentimentBucket: (bookId, sentimentBucket) => {
        const before = stateRef.current;
        const action = { type: "SET_SENTIMENT_BUCKET" as const, bookId, sentimentBucket };
        const next = appReducer(before, action);
        if (next === before) return;
        const hadRanking = bookHasBucketRanking(before, bookId);
        dispatch(action);
        if (!hadRanking && sentimentBucket) {
          const cat = next.catalog[bookId];
          const ub = next.userBooks[bookId];
          if (cat) {
            postFeedEvent({
              eventType: "finished",
              bookId,
              bookTitle: cat.title,
              bookAuthor: cat.author,
              bookCoverUrl: cat.coverUrl,
              shelf: "finished",
              sentiment: sentimentBucket,
              derivedScore: ub?.derivedScore ?? undefined,
            });
          }
        }
      },
      insertBookIntoBucketAtIndex: (bookId, bucket, index) => {
        const before = stateRef.current;
        if (!before.userBooks[bookId]) return;
        const action = {
          type: "INSERT_BOOK_INTO_BUCKET_AT_INDEX" as const,
          bookId,
          bucket,
          index,
        };
        const next = appReducer(before, action);
        if (next === before) return;
        const hadRanking = bookHasBucketRanking(before, bookId);
        dispatch(action);
        if (!hadRanking) {
          const cat = next.catalog[bookId];
          const ub = next.userBooks[bookId];
          if (cat && ub?.sentimentBucket) {
            postFeedEvent({
              eventType: "finished",
              bookId,
              bookTitle: cat.title,
              bookAuthor: cat.author,
              bookCoverUrl: cat.coverUrl,
              shelf: "finished",
              sentiment: ub.sentimentBucket,
              derivedScore: ub.derivedScore ?? undefined,
            });
          }
        }
      },
      updateBucketRankings: (bucket, orderedBookIds) =>
        dispatch({ type: "UPDATE_BUCKET_RANKINGS", bucket, orderedBookIds }),
      resetLibrary: () => dispatch({ type: "RESET_LIBRARY" }),
      resetSession: () => dispatch({ type: "RESET_SESSION" }),
      hydrateLibrary: (next) => dispatch({ type: "HYDRATE", payload: next }),
      updateUserBookNotes: (bookId, notes) =>
        dispatch({ type: "UPDATE_USER_BOOK_NOTES", bookId, notes }),
      updateCatalogGenres: (bookId, genres) =>
        dispatch({ type: "UPDATE_CATALOG_GENRES", bookId, genres }),
      updateProfile: (patch) => dispatch({ type: "UPDATE_PROFILE", ...patch }),
      dismissRec: (bookId, catalogBook) => dispatch({ type: "DISMISS_REC", bookId, catalogBook }),
      addBlacklistWord: (word) => dispatch({ type: "ADD_BLACKLIST_WORD", word }),
      removeBlacklistWord: (word) => dispatch({ type: "REMOVE_BLACKLIST_WORD", word }),
      restoreDismissedRec: (bookId) => dispatch({ type: "RESTORE_DISMISSED_REC", bookId }),
      restoreAllDismissedRecs: () => dispatch({ type: "RESTORE_ALL_DISMISSED_RECS" }),
    }),
    [],
  );

  const value = useMemo(
    () => ({ state, actions, ready }),
    [state, actions, ready],
  );

  return (
    <ReadingNookContext.Provider value={value}>{children}</ReadingNookContext.Provider>
  );
}

export function useReadingNook(): ReadingNookContextValue {
  const ctx = useContext(ReadingNookContext);
  if (!ctx) {
    throw new Error("useReadingNook must be used within ReadingNookProvider");
  }
  return ctx;
}
