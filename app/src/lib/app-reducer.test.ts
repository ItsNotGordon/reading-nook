import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appReducer } from "./app-reducer";
import { goodreadsImportId } from "./goodreadsImport";
import { defaultUserProfile, getInitialState } from "./storage";
import type { AppState, Book } from "./types";

function stateWithProfile(name: string, tagline: string): AppState {
  return {
    ...getInitialState(),
    profile: { displayName: name, tagline, theme: "plant" },
  };
}

describe("appReducer session reset", () => {
  it("RESET_SESSION clears profile to defaults", () => {
    const before = stateWithProfile("Gordon", "My bio");
    const after = appReducer(before, { type: "RESET_SESSION" });
    const d = defaultUserProfile();
    assert.equal(after.profile.displayName, d.displayName);
    assert.equal(after.profile.tagline, d.tagline);
    assert.equal(Object.keys(after.userBooks).length, 0);
  });

  it("RESET_LIBRARY keeps profile but clears shelves", () => {
    const before = stateWithProfile("Gordon", "My bio");
    const after = appReducer(before, { type: "RESET_LIBRARY" });
    assert.equal(after.profile.displayName, "Gordon");
    assert.equal(after.profile.tagline, "My bio");
    assert.equal(Object.keys(after.userBooks).length, 0);
  });
});

describe("appReducer sentiment bucket insert", () => {
  it("no-ops when userBooks entry is missing (prevents orphan feed updates)", () => {
    const bookId = goodreadsImportId("missing-user-book");
    const catalog: Record<string, Book> = {
      [bookId]: {
        id: bookId,
        title: "The Toll",
        author: "Author",
        coverUrl: "https://example.com/cover.jpg",
        totalPages: 100,
        genres: [],
        description: "",
      },
    };
    const before: AppState = { ...getInitialState(), catalog };
    const after = appReducer(before, {
      type: "INSERT_BOOK_INTO_BUCKET_AT_INDEX",
      bookId,
      bucket: "disliked",
      index: 0,
    });
    assert.equal(after, before);
    assert.deepEqual(after.bucketRankings.disliked, []);
  });
});
