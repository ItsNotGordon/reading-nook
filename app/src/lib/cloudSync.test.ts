import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideInitialSync, librariesDiffer, libraryFingerprint } from "./cloudSync";
import type { AppState, Book, UserBook } from "./types";

function book(id: string): Book {
  return {
    id,
    title: `Title ${id}`,
    author: "Author",
    coverUrl: "",
    totalPages: 0,
    genres: [],
    description: "",
  };
}

function shelved(bookId: string, shelf: UserBook["shelf"] = "reading"): UserBook {
  return {
    bookId,
    shelf,
    progressMode: "exact",
    currentPage: 1,
    estimatedRange: null,
    finishedAt: null,
    finishedSortAt: null,
    sentimentBucket: null,
    derivedScore: null,
    addedAt: "2025-01-01T00:00:00.000Z",
    notes: "",
  };
}

function baseState(overrides: Partial<AppState> = {}): AppState {
  return {
    version: 1,
    catalog: {},
    userBooks: {},
    bucketRankings: { liked: [], okay: [], disliked: [] },
    profile: { displayName: "A", tagline: "", theme: "plant" },
    dismissedRecIds: [],
    ...overrides,
  };
}

function withBook(id: string): AppState {
  return baseState({
    catalog: { [id]: book(id) },
    userBooks: { [id]: shelved(id) },
  });
}

describe("cloudSync", () => {
  it("decides noop, push, hydrate, conflict", () => {
    assert.equal(decideInitialSync(baseState(), null, null).action, "noop");
    assert.equal(decideInitialSync(withBook("x"), null, null).action, "push");
    assert.equal(decideInitialSync(baseState(), withBook("y"), "2024-01-01").action, "hydrate");

    const local = withBook("a");
    const cloud = withBook("b");
    const conflict = decideInitialSync(local, cloud, "2024-06-01");
    assert.equal(conflict.action, "conflict");
    if (conflict.action === "conflict") {
      assert.equal(conflict.localCount, 1);
      assert.equal(conflict.cloudCount, 1);
    }
  });

  it("preventAutoPush forces conflict instead of silent push on account switch", () => {
    const local = withBook("x");
    const push = decideInitialSync(local, null, null);
    assert.equal(push.action, "push");
    const blocked = decideInitialSync(local, null, null, { preventAutoPush: true });
    assert.equal(blocked.action, "conflict");
    if (blocked.action === "conflict") {
      assert.equal(blocked.cloudCount, 0);
      assert.equal(blocked.localCount, 1);
    }
  });

  it("fingerprints differ when libraries differ", () => {
    const local = withBook("a");
    const cloud = withBook("b");
    assert.equal(librariesDiffer(local, cloud), true);
    assert.equal(librariesDiffer(local, withBook("a")), false);
    assert.notEqual(libraryFingerprint(local), libraryFingerprint(cloud));
  });
});
