"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { appReducer } from "./app-reducer";
import type { AppState, Book, BookId, SentimentBucket, Shelf, UserProfile } from "./types";
import { getInitialState, loadState, saveState } from "./storage";

export type ReadingNookActions = {
  addBookToShelf: (bookId: BookId, shelf: Shelf, catalogBook?: Book) => void;
  moveBookToShelf: (bookId: BookId, shelf: Shelf) => void;
  updateExactProgress: (bookId: BookId, currentPage: number) => void;
  updateEstimatedProgress: (bookId: BookId, estimatedRange: [number, number]) => void;
  markFinished: (bookId: BookId) => void;
  removeUserBook: (bookId: BookId) => void;
  updateFinishedAt: (bookId: BookId, finishedAt: string) => void;
  setSentimentBucket: (bookId: BookId, sentimentBucket: SentimentBucket | null) => void;
  insertBookIntoBucketAtIndex: (bookId: BookId, bucket: SentimentBucket, index: number) => void;
  updateBucketRankings: (bucket: SentimentBucket, orderedBookIds: BookId[]) => void;
  /** Wipe shelves, rankings, and cached catalog copies (localStorage only). */
  resetLibrary: () => void;
  updateUserBookNotes: (bookId: BookId, notes: string) => void;
  updateProfile: (patch: Partial<Pick<UserProfile, "displayName" | "tagline">>) => void;
};

type ReadingNookContextValue = {
  state: AppState;
  actions: ReadingNookActions;
};

const ReadingNookContext = createContext<ReadingNookContextValue | null>(null);

export function ReadingNookProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      dispatch({ type: "HYDRATE", payload: loaded });
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
      addBookToShelf: (bookId, shelf, catalogBook) =>
        dispatch({ type: "ADD_BOOK_TO_SHELF", bookId, shelf, catalogBook }),
      moveBookToShelf: (bookId, shelf) =>
        dispatch({ type: "MOVE_BOOK_TO_SHELF", bookId, shelf }),
      updateExactProgress: (bookId, currentPage) =>
        dispatch({ type: "UPDATE_EXACT_PROGRESS", bookId, currentPage }),
      updateEstimatedProgress: (bookId, estimatedRange) =>
        dispatch({ type: "UPDATE_ESTIMATED_PROGRESS", bookId, estimatedRange }),
      markFinished: (bookId) => dispatch({ type: "MARK_FINISHED", bookId }),
      removeUserBook: (bookId) => dispatch({ type: "REMOVE_USER_BOOK", bookId }),
      updateFinishedAt: (bookId, finishedAt) =>
        dispatch({ type: "UPDATE_FINISHED_AT", bookId, finishedAt }),
      setSentimentBucket: (bookId, sentimentBucket) =>
        dispatch({ type: "SET_SENTIMENT_BUCKET", bookId, sentimentBucket }),
      insertBookIntoBucketAtIndex: (bookId, bucket, index) =>
        dispatch({ type: "INSERT_BOOK_INTO_BUCKET_AT_INDEX", bookId, bucket, index }),
      updateBucketRankings: (bucket, orderedBookIds) =>
        dispatch({ type: "UPDATE_BUCKET_RANKINGS", bucket, orderedBookIds }),
      resetLibrary: () => dispatch({ type: "RESET_LIBRARY" }),
      updateUserBookNotes: (bookId, notes) =>
        dispatch({ type: "UPDATE_USER_BOOK_NOTES", bookId, notes }),
      updateProfile: (patch) => dispatch({ type: "UPDATE_PROFILE", ...patch }),
    }),
    [],
  );

  const value = useMemo(
    () => ({ state, actions }),
    [state, actions],
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
