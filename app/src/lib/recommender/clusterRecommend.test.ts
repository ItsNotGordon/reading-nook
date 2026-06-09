import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RecPersonalRow } from "@/lib/recPersonalization";
import type { AppState, Book, UserBook } from "@/lib/types";
import { CLUSTER_SOURCE, clusterRecommend } from "./clusterRecommend";

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

function shelvedUserBook(
  bookId: string,
  shelf: UserBook["shelf"],
  bucket: UserBook["sentimentBucket"] = null,
): UserBook {
  return {
    bookId,
    shelf,
    visibility: "public",
    progressMode: "exact",
    currentPage: null,
    estimatedRange: null,
    finishedAt: shelf === "finished" ? "2025-01-01T00:00:00.000Z" : null,
    finishedSortAt: shelf === "finished" ? "2025-01-01T00:00:00.000Z" : null,
    sentimentBucket: bucket,
    derivedScore: bucket ? 8 : null,
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
    score: 5,
    reason: "base",
    source: "test",
  };
}

function diverseLibraryState(): AppState {
  const catalog: Record<string, Book> = {};
  const userBooks: Record<string, UserBook> = {};
  const fantasyIds = ["f1", "f2", "f3", "f4"];
  const mysteryIds = ["m1", "m2", "m3", "m4"];

  for (const id of fantasyIds) {
    catalog[id] = book(id, ["Fantasy"], `Fantasy Author ${id}`);
    userBooks[id] = shelvedUserBook(id, "finished", "liked");
  }
  for (const id of mysteryIds) {
    catalog[id] = book(id, ["Mystery"], `Mystery Author ${id}`);
    userBooks[id] = shelvedUserBook(
      id,
      "finished",
      id === "m4" ? "disliked" : "liked",
    );
  }
  catalog.w1 = book("w1", ["Fantasy"], "Fantasy Author w");
  userBooks.w1 = shelvedUserBook("w1", "want_to_read");

  return baseState({ catalog, userBooks });
}

describe("clusterRecommend", () => {
  it("returns empty when clusters cannot be built", () => {
    const rows = clusterRecommend(baseState(), [
      candidate("c1", ["Fantasy"], "X"),
    ]);
    assert.deepEqual(rows, []);
  });

  it("ranks fantasy candidate above unrelated genre for fantasy-heavy library", () => {
    const state = diverseLibraryState();
    const rows = clusterRecommend(state, [
      candidate("cand-f", ["Fantasy"], "Fantasy Author new"),
      candidate("cand-r", ["Romance"], "Romance Author new"),
    ]);
    assert.equal(rows.length, 2);
    const fantasy = rows.find((r) => r.bookId === "cand-f");
    const romance = rows.find((r) => r.bookId === "cand-r");
    assert.ok(fantasy && romance);
    assert.ok(fantasy.score >= romance.score);
    assert.equal(fantasy.source, CLUSTER_SOURCE);
    assert.ok(fantasy.reason.includes("group"));
  });

  it("labels rows with Taste Groups source and sentiment reason", () => {
    const state = diverseLibraryState();
    const rows = clusterRecommend(state, [
      candidate("cand-f", ["Fantasy"], "Fantasy Author new"),
    ]);
    assert.equal(rows[0]?.source, CLUSTER_SOURCE);
    assert.ok(
      rows[0]?.reason.includes("liked") ||
        rows[0]?.reason.includes("mixed") ||
        rows[0]?.reason.includes("not rated"),
    );
  });
});
