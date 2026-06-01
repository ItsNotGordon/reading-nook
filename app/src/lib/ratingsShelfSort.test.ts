import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultSortForShelf,
  parseRatingsSortParam,
  readingProgressFraction,
  sortFinishedRatingRows,
  sortShelfItems,
} from "./ratingsShelfSort";
import type { Book, UserBook } from "./types";

function book(id: string, title: string, author: string, totalPages = 100): Book {
  return {
    id,
    title,
    author,
    coverUrl: "",
    totalPages,
    genres: [],
    description: "",
  };
}

function ub(
  bookId: string,
  shelf: UserBook["shelf"],
  overrides: Partial<UserBook> = {},
): UserBook {
  return {
    bookId,
    shelf,
    visibility: "public",
    progressMode: "exact",
    currentPage: 1,
    estimatedRange: null,
    finishedAt: null,
    finishedSortAt: null,
    sentimentBucket: null,
    derivedScore: null,
    addedAt: "2024-01-01T00:00:00.000Z",
    notes: "",
    ...overrides,
  };
}

describe("ratingsShelfSort", () => {
  it("defaults finished to score_desc and others to added_desc", () => {
    assert.equal(defaultSortForShelf("finished"), "score_desc");
    assert.equal(defaultSortForShelf("want_to_read"), "added_desc");
  });

  it("default sort differs by shelf", () => {
    assert.equal(defaultSortForShelf("finished"), "score_desc");
    assert.equal(defaultSortForShelf("reading"), "added_desc");
  });

  it("parseRatingsSortParam rejects invalid sort for shelf", () => {
    assert.equal(parseRatingsSortParam("reading", "score_desc"), "added_desc");
    assert.equal(parseRatingsSortParam("finished", "score_asc"), "score_asc");
  });

  it("sortFinishedRatingRows by score with missing scores last on desc", () => {
    const rows = sortFinishedRatingRows(
      [
        {
          id: "a",
          title: "A",
          author: "X",
          score: 5,
          addedAt: "",
          finishedAt: null,
          finishedSortAt: null,
        },
        {
          id: "b",
          title: "B",
          author: "Y",
          score: null,
          addedAt: "",
          finishedAt: null,
          finishedSortAt: null,
        },
        {
          id: "c",
          title: "C",
          author: "Z",
          score: 8,
          addedAt: "",
          finishedAt: null,
          finishedSortAt: null,
        },
      ],
      "score_desc",
    );
    assert.deepEqual(
      rows.map((r) => r.id),
      ["c", "a", "b"],
    );
  });

  it("readingProgressFraction uses exact and estimated modes", () => {
    const b = book("b1", "T", "A", 100);
    assert.equal(
      readingProgressFraction(b, ub("b1", "reading", { currentPage: 50, progressMode: "exact" })),
      0.5,
    );
    assert.equal(
      readingProgressFraction(
        b,
        ub("b1", "reading", {
          progressMode: "estimated",
          currentPage: null,
          estimatedRange: [0.25, 0.5],
        }),
      ),
      0.375,
    );
    assert.equal(readingProgressFraction(b, ub("b1", "reading", { currentPage: null })), 0);
  });

  it("sortShelfItems by progress", () => {
    const catalog = {
      low: book("low", "Low", "A"),
      high: book("high", "High", "B"),
    };
    const items = sortShelfItems(
      [
        { book: catalog.low, userBook: ub("low", "reading", { currentPage: 10 }) },
        { book: catalog.high, userBook: ub("high", "reading", { currentPage: 90 }) },
      ],
      "progress_desc",
    );
    assert.equal(items[0]?.userBook.bookId, "high");
  });
});
