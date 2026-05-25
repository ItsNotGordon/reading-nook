import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RecPersonalRow } from "@/lib/recPersonalization";
import type { AppState, Book, UserBook } from "@/lib/types";
import { TFIDF_SOURCE, tfidfRecommend } from "./tfidfRecommend";

function book(id: string, genres: string[], author = "Author A"): Book {
  return {
    id,
    title: `Title ${id}`,
    author,
    coverUrl: "",
    totalPages: 0,
    genres,
    description: "",
  };
}

function finishedUserBook(bookId: string, bucket: "liked" | "okay" | "disliked"): UserBook {
  return {
    bookId,
    shelf: "finished",
    progressMode: "exact",
    currentPage: null,
    estimatedRange: null,
    finishedAt: "2025-01-01T00:00:00.000Z",
    finishedSortAt: "2025-01-01T00:00:00.000Z",
    sentimentBucket: bucket,
    derivedScore: 8,
    addedAt: "2024-12-01T00:00:00.000Z",
    notes: "",
  };
}

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    version: 1,
    catalog: {},
    userBooks: {},
    bucketRankings: { liked: [], okay: [], disliked: [] },
    profile: { displayName: "Test", tagline: "", theme: "plant" },
    dismissedRecIds: [],
    ...overrides,
  };
}

function candidate(id: string, genres: string[], author: string): RecPersonalRow {
  return {
    bookId: id,
    title: `Title ${id}`,
    author,
    coverUrl: "",
    genres,
    score: 0,
    reason: "",
    source: "",
  };
}

describe("tfidfRecommend", () => {
  it("ranks matching-genre candidates above mismatched genres", () => {
    const likedId = "openlibrary:OL_LIKE";
    const fantasyCandidate = "openlibrary:OL_FAN";
    const romanceCandidate = "openlibrary:OL_ROM";
    const state = baseState({
      catalog: {
        [likedId]: book(likedId, ["Fantasy"], "Author X"),
      },
      userBooks: {
        [likedId]: finishedUserBook(likedId, "liked"),
      },
    });
    const rows = tfidfRecommend(state, [
      candidate(fantasyCandidate, ["Fantasy"], "Author Y"),
      candidate(romanceCandidate, ["Romance"], "Author Z"),
    ]);
    assert.equal(rows[0]?.bookId, fantasyCandidate);
  });

  it("labels rows with Similar Vibes source", () => {
    const likedId = "openlibrary:OL_LIKE2";
    const candidateId = "openlibrary:OL_CAND2";
    const state = baseState({
      catalog: {
        [likedId]: book(likedId, ["Mystery"], "Author X"),
      },
      userBooks: {
        [likedId]: finishedUserBook(likedId, "liked"),
      },
    });
    const rows = tfidfRecommend(state, [
      candidate(candidateId, ["Mystery"], "Author Y"),
    ]);
    assert.equal(rows[0]?.source, TFIDF_SOURCE);
    assert.ok(rows[0]?.reason.includes("genre") || rows[0]?.reason.includes("author"));
  });
});
