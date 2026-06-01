import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appReducer } from "./app-reducer";
import { getInitialState } from "./storage";
import { moveShelfTargets, parseRatingsShelfParam, shelfDisplayName } from "./shelves";
import type { Book, UserBook } from "./types";

describe("shelves", () => {
  it("labels did not finish shelf", () => {
    assert.equal(shelfDisplayName("did_not_finish"), "Did Not Finish");
  });

  it("offers all other shelves when moving from reading", () => {
    const targets = moveShelfTargets("reading");
    assert.ok(targets.includes("did_not_finish"));
    assert.ok(!targets.includes("reading"));
  });

  it("parseRatingsShelfParam defaults to finished", () => {
    assert.equal(parseRatingsShelfParam(null), "finished");
    assert.equal(parseRatingsShelfParam("finished"), "finished");
    assert.equal(parseRatingsShelfParam("want_to_read"), "want_to_read");
    assert.equal(parseRatingsShelfParam("invalid"), "finished");
  });
});

describe("MOVE_BOOK_TO_SHELF did_not_finish", () => {
  const book: Book = {
    id: "b1",
    title: "Test",
    author: "Author",
    coverUrl: "",
    totalPages: 200,
    genres: [],
    description: "",
  };

  const finishedUb: UserBook = {
    bookId: "b1",
    shelf: "finished",
    visibility: "public",
    progressMode: "exact",
    currentPage: 200,
    estimatedRange: null,
    finishedAt: "2024-01-01T00:00:00.000Z",
    finishedSortAt: "2024-01-01T00:00:00.000Z",
    sentimentBucket: "liked",
    derivedScore: 8.5,
    addedAt: "2024-01-01T00:00:00.000Z",
    notes: "notes",
  };

  it("clears finished rating fields when moving to did_not_finish", () => {
    const state = {
      ...getInitialState(),
      catalog: { b1: book },
      userBooks: { b1: finishedUb },
      bucketRankings: {
        liked: ["b1"],
        okay: [],
        disliked: [],
      },
    };
    const next = appReducer(state, {
      type: "MOVE_BOOK_TO_SHELF",
      bookId: "b1",
      shelf: "did_not_finish",
    });
    const ub = next.userBooks.b1;
    assert.equal(ub?.shelf, "did_not_finish");
    assert.equal(ub?.sentimentBucket, null);
    assert.equal(ub?.derivedScore, null);
    assert.equal(ub?.finishedAt, null);
    assert.ok(!next.bucketRankings.liked.includes("b1"));
  });
});
