import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFriendProfileSummary } from "./friendProfileSummary";
import { getInitialState } from "./storage";
import type { AppState, Book, BookId } from "./types";

function withFinishedBook(
  state: AppState,
  id: BookId,
  book: Book,
  sentiment: "liked" | "okay" | "disliked",
  score: number,
): AppState {
  return {
    ...state,
    catalog: { ...state.catalog, [id]: book },
    userBooks: {
      ...state.userBooks,
      [id]: {
        bookId: id,
        shelf: "finished",
        progressMode: "exact",
        currentPage: null,
        estimatedRange: null,
        finishedAt: "2024-06-01",
        finishedSortAt: "2024-06-01",
        sentimentBucket: sentiment,
        derivedScore: score,
        addedAt: "2024-01-01",
        notes: "",
      },
    },
    bucketRankings: {
      ...state.bucketRankings,
      [sentiment]: [id, ...(state.bucketRankings[sentiment] ?? [])],
    },
  };
}

describe("buildFriendProfileSummary", () => {
  it("computes genres, authors, and ratings from finished books", () => {
    let state = getInitialState();
    state = withFinishedBook(
      state,
      "b1",
      {
        id: "b1",
        title: "Dune",
        author: "Frank Herbert",
        coverUrl: "https://example.com/cover.jpg",
        totalPages: 400,
        genres: ["Science Fiction"],
        description: "",
      },
      "liked",
      9.2,
    );

    const summary = buildFriendProfileSummary(state);
    assert.equal(summary.finishedCount, 1);
    assert.equal(summary.ratings.length, 1);
    assert.equal(summary.ratings[0]?.title, "Dune");
    assert.ok(summary.topGenres.some((g) => g.label === "Science Fiction"));
    assert.ok(summary.topAuthors.some((a) => a.label === "Frank Herbert"));
    assert.equal(summary.sentimentInsights.find((s) => s.bucket === "liked")?.count, 1);
  });
});
