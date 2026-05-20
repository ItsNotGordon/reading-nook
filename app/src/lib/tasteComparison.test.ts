import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTasteComparison } from "./tasteComparison";
import { getInitialState } from "./storage";
import type { AppState, Book, BookId } from "./types";

function withRatedBook(
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

const sharedBook: Book = {
  id: "shared-1",
  title: "Dune",
  author: "Frank Herbert",
  coverUrl: "https://example.com/dune.jpg",
  totalPages: 400,
  genres: ["Science Fiction"],
  description: "",
};

describe("buildTasteComparison", () => {
  it("finds shared rated books with both scores", () => {
    const yours = withRatedBook(getInitialState(), "shared-1", sharedBook, "liked", 8.5);
    const theirs = withRatedBook(getInitialState(), "shared-1", sharedBook, "okay", 7.0);

    const cmp = buildTasteComparison(yours, theirs);
    assert.equal(cmp.sharedRatedBooks.length, 1);
    assert.equal(cmp.sharedRatedBooks[0]?.title, "Dune");
    assert.equal(cmp.sharedRatedBooks[0]?.yourScore, 8.5);
    assert.equal(cmp.sharedRatedBooks[0]?.friendScore, 7.0);
    assert.equal(cmp.sharedRatedBooks[0]?.yourSentiment, "liked");
    assert.equal(cmp.sharedRatedBooks[0]?.friendSentiment, "okay");
  });

  it("includes shared genres when both users read same genre", () => {
    const yours = withRatedBook(getInitialState(), "a", { ...sharedBook, id: "a" }, "liked", 9);
    const theirs = withRatedBook(
      getInitialState(),
      "b",
      { ...sharedBook, id: "b", title: "Neuromancer", genres: ["Science Fiction"] },
      "liked",
      8,
    );
    const cmp = buildTasteComparison(yours, theirs);
    assert.ok(cmp.sharedGenres.includes("Science Fiction"));
    assert.ok(cmp.sharedAuthors.includes("Frank Herbert"));
  });
});
