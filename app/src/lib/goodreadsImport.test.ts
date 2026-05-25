import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanIsbn,
  parseGoodreadsCsv,
  mapShelf,
  mapRatingToSentiment,
  buildImportPlan,
  mergeImportIntoState,
  isCustomShelf,
  stripSeriesInfo,
} from "./goodreadsImport";
import { getInitialState } from "./storage";

const HEADER =
  "Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Owned Copies";

function row(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    "Book Id": "12345",
    Title: "The Great Gatsby",
    Author: "F. Scott Fitzgerald",
    "Author l-f": "Fitzgerald, F. Scott",
    "Additional Authors": "",
    ISBN: '="0743273567"',
    ISBN13: '="9780743273565"',
    "My Rating": "4",
    "Average Rating": "3.93",
    Publisher: "Scribner",
    Binding: "Paperback",
    "Number of Pages": "180",
    "Year Published": "2004",
    "Original Publication Year": "1925",
    "Date Read": "2023/05/10",
    "Date Added": "2023/01/15",
    Bookshelves: "classics",
    "Bookshelves with positions": "classics (#1)",
    "Exclusive Shelf": "read",
    "My Review": "A masterpiece.",
    Spoiler: "",
    "Private Notes": "",
    "Read Count": "1",
    "Owned Copies": "0",
  };
  const merged = { ...defaults, ...overrides };
  const headerCols = HEADER.split(",");
  return headerCols.map((h) => {
    const val = merged[h] ?? "";
    return val.includes(",") || val.includes('"') || val.includes("\n")
      ? `"${val.replace(/"/g, '""')}"`
      : val;
  }).join(",");
}

function csvWith(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

describe("cleanIsbn", () => {
  it("strips Goodreads =\"...\" wrapper", () => {
    assert.equal(cleanIsbn('="0743273567"'), "0743273567");
  });

  it("handles ISBN13 wrapper", () => {
    assert.equal(cleanIsbn('="9780743273565"'), "9780743273565");
  });

  it("returns empty for empty wrapper", () => {
    assert.equal(cleanIsbn('=""'), "");
  });

  it("returns empty for invalid length", () => {
    assert.equal(cleanIsbn("123"), "");
  });

  it("passes through clean ISBN10", () => {
    assert.equal(cleanIsbn("0743273567"), "0743273567");
  });
});

describe("parseGoodreadsCsv", () => {
  it("parses a single-row CSV", () => {
    const csv = csvWith(row());
    const rows = parseGoodreadsCsv(csv);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, "The Great Gatsby");
    assert.equal(rows[0].author, "F. Scott Fitzgerald");
    assert.equal(rows[0].isbn, "0743273567");
    assert.equal(rows[0].isbn13, "9780743273565");
    assert.equal(rows[0].myRating, 4);
    assert.equal(rows[0].numberOfPages, 180);
    assert.equal(rows[0].originalPublicationYear, 1925);
    assert.equal(rows[0].exclusiveShelf, "read");
  });

  it("skips empty rows", () => {
    const csv = csvWith(row(), "", row({ Title: "Another Book" }));
    const rows = parseGoodreadsCsv(csv);
    assert.equal(rows.length, 2);
  });

  it("throws on empty file", () => {
    assert.throws(() => parseGoodreadsCsv(""), /empty/i);
  });

  it("throws on missing required header", () => {
    assert.throws(
      () => parseGoodreadsCsv("Book Id,ISBN\n123,456"),
      /Missing required column/,
    );
  });

  it("handles quoted fields with commas", () => {
    const csv = csvWith(
      row({ "My Review": '"A great, wonderful book"' }),
    );
    const rows = parseGoodreadsCsv(csv);
    assert.ok(rows[0].myReview.includes("great"));
  });
});

describe("mapShelf", () => {
  it("maps read to finished", () => {
    assert.equal(mapShelf("read"), "finished");
  });

  it("maps currently-reading to reading", () => {
    assert.equal(mapShelf("currently-reading"), "reading");
  });

  it("maps to-read to want_to_read", () => {
    assert.equal(mapShelf("to-read"), "want_to_read");
  });

  it("maps unknown shelves to want_to_read", () => {
    assert.equal(mapShelf("favorites"), "want_to_read");
  });
});

describe("isCustomShelf", () => {
  it("returns false for standard shelves", () => {
    assert.equal(isCustomShelf("read"), false);
    assert.equal(isCustomShelf("currently-reading"), false);
    assert.equal(isCustomShelf("to-read"), false);
  });

  it("returns true for custom shelves", () => {
    assert.equal(isCustomShelf("favorites"), true);
    assert.equal(isCustomShelf("abandoned"), true);
  });
});

describe("mapRatingToSentiment", () => {
  it("maps 5 to liked for finished books", () => {
    assert.equal(mapRatingToSentiment(5, "finished"), "liked");
  });

  it("maps 4 to liked", () => {
    assert.equal(mapRatingToSentiment(4, "finished"), "liked");
  });

  it("maps 3 to okay", () => {
    assert.equal(mapRatingToSentiment(3, "finished"), "okay");
  });

  it("maps 2 to disliked", () => {
    assert.equal(mapRatingToSentiment(2, "finished"), "disliked");
  });

  it("maps 1 to disliked", () => {
    assert.equal(mapRatingToSentiment(1, "finished"), "disliked");
  });

  it("maps 0 to null", () => {
    assert.equal(mapRatingToSentiment(0, "finished"), null);
  });

  it("returns null for non-finished shelves regardless of rating", () => {
    assert.equal(mapRatingToSentiment(5, "reading"), null);
    assert.equal(mapRatingToSentiment(4, "want_to_read"), null);
  });
});

describe("stripSeriesInfo", () => {
  it("strips (#N) series parenthetical", () => {
    assert.equal(stripSeriesInfo("Dune (Dune, #1)"), "Dune");
  });

  it("strips complex series parenthetical", () => {
    assert.equal(
      stripSeriesInfo("The Hobbit (The Lord of the Rings, #0)"),
      "The Hobbit",
    );
  });

  it("strips parenthetical with book keyword", () => {
    assert.equal(
      stripSeriesInfo("Gone Girl, Book 1"),
      "Gone Girl",
    );
  });

  it("strips trailing #N", () => {
    assert.equal(stripSeriesInfo("Dune #1"), "Dune");
  });

  it("leaves plain titles alone", () => {
    assert.equal(stripSeriesInfo("Dune"), "Dune");
    assert.equal(stripSeriesInfo("The Great Gatsby"), "The Great Gatsby");
  });

  it("leaves titles with non-series parentheses alone", () => {
    assert.equal(
      stripSeriesInfo("The Art of War (Annotated)"),
      "The Art of War (Annotated)",
    );
  });
});

describe("buildImportPlan", () => {
  it("builds correct counts for mixed rows", () => {
    const csv = csvWith(
      row({ "Exclusive Shelf": "read", "My Rating": "5" }),
      row({ "Book Id": "2", Title: "Book 2", "Exclusive Shelf": "to-read", "My Rating": "0" }),
      row({ "Book Id": "3", Title: "Book 3", "Exclusive Shelf": "currently-reading", "My Rating": "0" }),
    );
    const grRows = parseGoodreadsCsv(csv);
    const plan = buildImportPlan(grRows, getInitialState());

    assert.equal(plan.totalRows, 3);
    assert.equal(plan.toImport, 3);
    assert.equal(plan.duplicates, 0);
    assert.equal(plan.byShelf.finished, 1);
    assert.equal(plan.byShelf.want_to_read, 1);
    assert.equal(plan.byShelf.reading, 1);
    assert.equal(plan.bySentiment.liked, 1);
  });

  it("detects series-variant as duplicate", () => {
    const state = getInitialState();
    state.catalog["existing"] = {
      id: "existing",
      title: "Dune",
      author: "Frank Herbert",
      coverUrl: "https://covers.openlibrary.org/b/id/123-M.jpg",
      totalPages: 412,
      genres: ["Science Fiction"],
      description: "",
    };
    state.userBooks["existing"] = {
      bookId: "existing",
      shelf: "finished",
      progressMode: "exact",
      currentPage: 412,
      estimatedRange: null,
      finishedAt: "2023-01-01T00:00:00.000Z",
      finishedSortAt: "2023-01-01T00:00:00.000Z",
      sentimentBucket: "liked",
      derivedScore: 10,
      addedAt: "2023-01-01T00:00:00.000Z",
      notes: "",
    };

    const csv = csvWith(
      row({ Title: "Dune (Dune, #1)", Author: "Frank Herbert", "Exclusive Shelf": "read", "My Rating": "5" }),
    );
    const grRows = parseGoodreadsCsv(csv);
    const plan = buildImportPlan(grRows, state);

    assert.equal(plan.duplicates, 1);
    assert.equal(plan.toImport, 0);
  });

  it("detects duplicates by title+author", () => {
    const state = getInitialState();
    state.catalog["existing"] = {
      id: "existing",
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      coverUrl: "",
      totalPages: 180,
      genres: [],
      description: "",
    };
    state.userBooks["existing"] = {
      bookId: "existing",
      shelf: "finished",
      progressMode: "exact",
      currentPage: 180,
      estimatedRange: null,
      finishedAt: "2023-01-01T00:00:00.000Z",
      finishedSortAt: "2023-01-01T00:00:00.000Z",
      sentimentBucket: "liked",
      derivedScore: 10,
      addedAt: "2023-01-01T00:00:00.000Z",
      notes: "",
    };

    const csv = csvWith(row());
    const grRows = parseGoodreadsCsv(csv);
    const plan = buildImportPlan(grRows, state);

    assert.equal(plan.duplicates, 1);
    assert.equal(plan.toImport, 0);
  });
});

describe("mergeImportIntoState", () => {
  it("adds imported books to catalog and userBooks", () => {
    const csv = csvWith(
      row({ "Exclusive Shelf": "read", "My Rating": "5" }),
      row({ "Book Id": "2", Title: "Book 2", "Exclusive Shelf": "to-read", "My Rating": "0" }),
    );
    const grRows = parseGoodreadsCsv(csv);
    const plan = buildImportPlan(grRows, getInitialState());
    const result = mergeImportIntoState(getInitialState(), plan.importRows);

    assert.equal(Object.keys(result.catalog).length, 2);
    assert.equal(Object.keys(result.userBooks).length, 2);

    const finishedBook = Object.values(result.userBooks).find(
      (ub) => ub?.shelf === "finished",
    );
    assert.ok(finishedBook);
    assert.equal(finishedBook.sentimentBucket, "liked");
    assert.equal(result.bucketRankings.liked.length, 1);
  });

  it("preserves existing books and appends imports to rankings", () => {
    const state = getInitialState();
    state.catalog["existing"] = {
      id: "existing",
      title: "Existing Book",
      author: "Author",
      coverUrl: "",
      totalPages: 100,
      genres: [],
      description: "",
    };
    state.userBooks["existing"] = {
      bookId: "existing",
      shelf: "finished",
      progressMode: "exact",
      currentPage: 100,
      estimatedRange: null,
      finishedAt: "2023-01-01T00:00:00.000Z",
      finishedSortAt: "2023-01-01T00:00:00.000Z",
      sentimentBucket: "liked",
      derivedScore: 10,
      addedAt: "2023-01-01T00:00:00.000Z",
      notes: "",
    };
    state.bucketRankings.liked = ["existing"];

    const csv = csvWith(row({ "Exclusive Shelf": "read", "My Rating": "4" }));
    const grRows = parseGoodreadsCsv(csv);
    const plan = buildImportPlan(grRows, state);
    const result = mergeImportIntoState(state, plan.importRows);

    assert.equal(result.bucketRankings.liked[0], "existing");
    assert.equal(result.bucketRankings.liked.length, 2);
    assert.ok(result.userBooks["existing"]);
  });
});
