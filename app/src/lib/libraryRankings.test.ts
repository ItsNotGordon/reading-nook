import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appReducer } from "./app-reducer";
import { goodreadsImportId } from "./goodreadsImport";
import { bookHasBucketRanking, reconcileRankingsState } from "./libraryRankings";
import { scoreForRankIndex } from "./ranking";
import { getInitialState } from "./storage";
import type { AppState, Book, UserBook } from "./types";

const TOLL_ID = goodreadsImportId("999001");

function tollCatalog(): Book {
  return {
    id: TOLL_ID,
    title: "The Toll",
    author: "Neal Shusterman",
    coverUrl: "https://example.com/toll.jpg",
    totalPages: 640,
    genres: ["Young Adult"],
    description: "",
  };
}

function finishedOkayState(): AppState {
  const catalog = { [TOLL_ID]: tollCatalog() };
  const userBooks: AppState["userBooks"] = {
    [TOLL_ID]: {
      bookId: TOLL_ID,
      shelf: "finished",
      visibility: "public",
      progressMode: "estimated",
      currentPage: null,
      estimatedRange: [1, 1],
      finishedAt: "2024-01-01T00:00:00.000Z",
      finishedSortAt: "2024-01-01T00:00:00.000Z",
      sentimentBucket: "okay",
      derivedScore: 3.6,
      addedAt: "2024-01-01T00:00:00.000Z",
      notes: "",
    },
  };
  return {
    ...getInitialState(),
    catalog,
    userBooks,
    bucketRankings: {
      liked: [],
      okay: [TOLL_ID],
      disliked: [],
    },
  };
}

describe("libraryRankings sentiment moves", () => {
  it("moves a Goodreads-imported book from okay to disliked with score 1.0", () => {
    const before = finishedOkayState();
    assert.equal(bookHasBucketRanking(before, TOLL_ID), true);

    const after = appReducer(before, {
      type: "INSERT_BOOK_INTO_BUCKET_AT_INDEX",
      bookId: TOLL_ID,
      bucket: "disliked",
      index: 0,
    });

    assert.ok(!after.bucketRankings.okay.includes(TOLL_ID));
    assert.deepEqual(after.bucketRankings.disliked, [TOLL_ID]);
    assert.equal(after.userBooks[TOLL_ID]?.sentimentBucket, "disliked");
    assert.equal(after.userBooks[TOLL_ID]?.derivedScore, scoreForRankIndex("disliked", 0, 1));
  });

  it("reconcileRankingsState repairs sentimentBucket drift from rankings", () => {
    const base = finishedOkayState();
    const drifted: AppState = {
      ...base,
      userBooks: {
        [TOLL_ID]: {
          ...(base.userBooks[TOLL_ID] as UserBook),
          sentimentBucket: "disliked",
          derivedScore: scoreForRankIndex("disliked", 0, 1),
        },
      },
      bucketRankings: {
        liked: [],
        okay: [TOLL_ID],
        disliked: [],
      },
    };

    const fixed = reconcileRankingsState(drifted);
    assert.ok(!fixed.bucketRankings.okay.includes(TOLL_ID));
    assert.deepEqual(fixed.bucketRankings.disliked, [TOLL_ID]);
    assert.equal(fixed.userBooks[TOLL_ID]?.sentimentBucket, "disliked");
    assert.equal(fixed.userBooks[TOLL_ID]?.derivedScore, scoreForRankIndex("disliked", 0, 1));
  });
});
