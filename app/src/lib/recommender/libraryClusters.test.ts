import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppState, Book, UserBook } from "@/lib/types";
import { buildLibraryVectors } from "./bookFeatureVector";
import { buildLibraryClusters } from "./libraryClusters";

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

function buildDiverseLibrary(): AppState {
  const catalog: Record<string, Book> = {};
  const userBooks: Record<string, UserBook> = {};

  const fantasyIds = ["f1", "f2", "f3", "f4"];
  const mysteryIds = ["m1", "m2", "m3", "m4"];

  for (const id of fantasyIds) {
    catalog[id] = book(id, ["Fantasy"], `Fantasy Author ${id}`);
    userBooks[id] = shelvedUserBook(
      id,
      "finished",
      id === "f4" ? "okay" : "liked",
    );
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

describe("buildLibraryClusters", () => {
  it("returns null without taste signals", () => {
    const state = baseState();
    assert.equal(buildLibraryClusters(state), null);
  });

  it("returns null when shelved count is below minimum", () => {
    const state = baseState({
      catalog: { a: book("a", ["Fantasy"]) },
      userBooks: { a: shelvedUserBook("a", "finished", "liked") },
    });
    assert.equal(buildLibraryClusters(state), null);
  });

  it("excludes did_not_finish from clustering", () => {
    const state = buildDiverseLibrary();
    state.catalog.dnf = book("dnf", ["Horror"]);
    state.userBooks.dnf = shelvedUserBook("dnf", "did_not_finish", "disliked");
    const rows = buildLibraryVectors(state);
    assert.ok(!rows.some((r) => r.bookId === "dnf"));
    assert.equal(rows.length, 9);
    const model = buildLibraryClusters(state);
    assert.ok(model);
    const clusteredCount =
      model.clusters.reduce((s, c) => s + c.bookCount, 0) + model.noiseCount;
    assert.equal(clusteredCount, 9);
  });

  it("paints clusters with liked okay disliked counts", () => {
    const model = buildLibraryClusters(buildDiverseLibrary());
    assert.ok(model);
    assert.ok(model.clusters.length >= 2);
    const rated = model.clusters.filter((c) => c.ratedCount > 0);
    assert.ok(rated.length >= 2);
    const hasLiked = rated.some((c) => c.liked > 0);
    const hasDisliked = rated.some((c) => c.disliked > 0);
    assert.ok(hasLiked);
    assert.ok(hasDisliked);
  });

  it("assigns neutral affinity to clusters without finished ratings", () => {
    const catalog: Record<string, Book> = {};
    const userBooks: Record<string, UserBook> = {};
    for (let i = 0; i < 6; i += 1) {
      const id = `w${i}`;
      catalog[id] = book(id, i < 3 ? ["Fantasy"] : ["Mystery"], `Author ${i}`);
      userBooks[id] = shelvedUserBook(id, "want_to_read");
    }
    catalog.rated = book("rated", ["Fantasy"]);
    userBooks.rated = shelvedUserBook("rated", "finished", "liked");
    const model = buildLibraryClusters(baseState({ catalog, userBooks }));
    assert.ok(model);
    const unpainted = model.clusters.find((c) => c.ratedCount === 0);
    if (unpainted) {
      assert.equal(unpainted.likeAffinity, 0.5);
    }
  });
});
