import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  sentimentRatingChanged,
  shouldPostInitialFinishedFeed,
} from "./sentimentFeed";
import { getInitialState } from "./storage";
import type { AppState, Book, BookId } from "./types";

function withFinished(
  state: AppState,
  bookId: BookId,
  book: Book,
  sentiment: "liked" | "okay" | "disliked",
  score: number,
  inRankings: boolean,
): AppState {
  const rankings = { ...state.bucketRankings };
  if (inRankings) {
    rankings[sentiment] = [...rankings[sentiment], bookId];
  }
  return {
    ...state,
    catalog: { ...state.catalog, [bookId]: book },
    userBooks: {
      ...state.userBooks,
      [bookId]: {
        bookId,
        shelf: "finished",
        visibility: "public",
        progressMode: "estimated",
        currentPage: null,
        estimatedRange: [1, 1],
        finishedAt: "2024-01-01T00:00:00.000Z",
        finishedSortAt: "2024-01-01T00:00:00.000Z",
        sentimentBucket: sentiment,
        derivedScore: score,
        addedAt: "2024-01-01T00:00:00.000Z",
        notes: "",
      },
    },
    bucketRankings: rankings,
  };
}

const sampleBook: Book = {
  id: "googlebooks:1",
  title: "Dune",
  author: "Frank Herbert",
  coverUrl: "https://example.com/cover.jpg",
  totalPages: 400,
  genres: [],
  description: "",
};

describe("sentimentFeed", () => {
  it("detects sentiment changes", () => {
    const before = withFinished(getInitialState(), "googlebooks:1", sampleBook, "okay", 5, true);
    const after = withFinished(getInitialState(), "googlebooks:1", sampleBook, "disliked", 2, true);
    assert.equal(sentimentRatingChanged(before, after, "googlebooks:1"), true);
    assert.equal(sentimentRatingChanged(after, after, "googlebooks:1"), false);
  });

  it("treats first bucket placement as initial finish feed", () => {
    const before = withFinished(getInitialState(), "googlebooks:1", sampleBook, "okay", 5, false);
    assert.equal(shouldPostInitialFinishedFeed(before, "googlebooks:1"), true);
    const after = withFinished(getInitialState(), "googlebooks:1", sampleBook, "okay", 5, true);
    assert.equal(shouldPostInitialFinishedFeed(after, "googlebooks:1"), false);
  });
});
