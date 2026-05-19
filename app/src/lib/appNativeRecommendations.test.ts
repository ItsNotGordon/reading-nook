import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppState, Book, UserBook } from "@/lib/types";
import { HYBRID_SOURCE } from "@/lib/recommender";
import {
  buildAppNativeRecommendations,
  collectCandidates,
  countUnshelvedCatalog,
  isOpenLibraryBookId,
} from "./appNativeRecommendations";

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
    profile: { displayName: "Test", tagline: "" },
    ...overrides,
  };
}

describe("isOpenLibraryBookId", () => {
  it("detects openlibrary prefix", () => {
    assert.equal(isOpenLibraryBookId("openlibrary:OL123W"), true);
    assert.equal(isOpenLibraryBookId("42"), false);
  });
});

describe("collectCandidates", () => {
  it("uses catalog only and ignores numeric goodreads ids", () => {
    const likedId = "openlibrary:OL1W";
    const state = baseState({
      catalog: {
        [likedId]: book(likedId, ["Fantasy"]),
        "999": book("999", ["Romance"]),
      },
      userBooks: { [likedId]: finishedUserBook(likedId, "liked") },
    });
    const candidates = collectCandidates(state, [
      {
        bookId: "openlibrary:OL888W",
        title: "Discover",
        author: "X",
        coverUrl: "",
        genres: ["Fantasy"],
        score: 5,
        reason: "r",
        source: "openlibrary-discover",
      },
    ]);
    assert.ok(candidates.some((c) => c.bookId === "999"));
    assert.ok(candidates.some((c) => c.bookId === "openlibrary:OL888W"));
    assert.ok(!candidates.some((c) => c.bookId === "888"));
  });
});

describe("buildAppNativeRecommendations", () => {
  it("returns empty reason when no taste signal", () => {
    const result = buildAppNativeRecommendations(baseState());
    assert.equal(result.recommendations.length, 0);
    assert.ok(result.emptyReason?.includes("Finish and rate"));
  });

  it("recommends unshelved catalog books with matching genres", () => {
    const likedId = "openlibrary:OL1W";
    const candidateId = "openlibrary:OL2W";
    const state = baseState({
      catalog: {
        [likedId]: book(likedId, ["Fantasy"], "Liked Author"),
        [candidateId]: book(candidateId, ["Fantasy", "Adventure"], "Other"),
      },
      userBooks: {
        [likedId]: finishedUserBook(likedId, "liked"),
      },
    });

    const result = buildAppNativeRecommendations(state);
    assert.ok(result.recommendations.some((r) => r.bookId === candidateId));
    assert.equal(result.emptyReason, null);
  });

  it("excludes shelved books", () => {
    const id = "openlibrary:OL3W";
    const state = baseState({
      catalog: { [id]: book(id, ["Mystery"]) },
      userBooks: { [id]: finishedUserBook(id, "liked") },
    });
    const result = buildAppNativeRecommendations(state);
    assert.ok(!result.recommendations.some((r) => r.bookId === id));
  });

  it("uses Apriori + KNN source and reason for native rows", () => {
    const likedId = "openlibrary:OL10W";
    const candidateId = "openlibrary:OL11W";
    const state = baseState({
      catalog: {
        [likedId]: book(likedId, ["Fantasy"], "A"),
        [candidateId]: book(candidateId, ["Fantasy"], "B"),
      },
      userBooks: {
        [likedId]: finishedUserBook(likedId, "liked"),
      },
    });
    const result = buildAppNativeRecommendations(state);
    const row = result.recommendations.find((r) => r.bookId === candidateId);
    assert.ok(row);
    assert.equal(row?.source, HYBRID_SOURCE);
    assert.ok(row?.reason.includes("Apriori") || row?.reason.includes("KNN"));
  });

  it("ranks sci-fi above romance after many liked sci-fi and one disliked romance", () => {
    const catalog: Record<string, Book> = {};
    const userBooks: Record<string, UserBook> = {};
    for (let i = 0; i < 4; i += 1) {
      const id = `openlibrary:SF${i}`;
      catalog[id] = book(id, ["Science Fiction"], "Author");
      userBooks[id] = finishedUserBook(id, "liked");
    }
    const dislikedId = "openlibrary:ROM";
    catalog[dislikedId] = book(dislikedId, ["Romance"], "Author");
    userBooks[dislikedId] = finishedUserBook(dislikedId, "disliked");

    const sfCandidate = "openlibrary:SF_CAND";
    const romCandidate = "openlibrary:ROM_CAND";
    catalog[sfCandidate] = book(sfCandidate, ["Science Fiction"], "Other");
    catalog[romCandidate] = book(romCandidate, ["Romance"], "Other");

    const state = baseState({ catalog, userBooks });
    const result = buildAppNativeRecommendations(state);
    const sf = result.recommendations.find((r) => r.bookId === sfCandidate);
    const rom = result.recommendations.find((r) => r.bookId === romCandidate);
    assert.ok(sf && rom);
    assert.ok(sf.score >= rom.score);
  });

  it("prefers higher readinglogCount when taste is similar", () => {
    const likedId = "openlibrary:OL_L";
    const lowPop = "openlibrary:LOW";
    const highPop = "openlibrary:HIGH";
    const state = baseState({
      catalog: {
        [likedId]: book(likedId, ["Fantasy"], "A"),
        [lowPop]: { ...book(lowPop, ["Fantasy"], "B"), readinglogCount: 10 },
        [highPop]: { ...book(highPop, ["Fantasy"], "C"), readinglogCount: 50000 },
      },
      userBooks: { [likedId]: finishedUserBook(likedId, "liked") },
    });
    const result = buildAppNativeRecommendations(state);
    const low = result.recommendations.find((r) => r.bookId === lowPop);
    const high = result.recommendations.find((r) => r.bookId === highPop);
    assert.ok(low && high);
    assert.ok(high.score >= low.score);
  });
});

describe("countUnshelvedCatalog", () => {
  it("counts only unshelved catalog books", () => {
    const a = "openlibrary:A";
    const b = "openlibrary:B";
    const state = baseState({
      catalog: { [a]: book(a, ["Fantasy"]), [b]: book(b, ["Fantasy"]) },
      userBooks: { [a]: finishedUserBook(a, "liked") },
    });
    assert.equal(countUnshelvedCatalog(state), 1);
  });
});
