import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBookMatchKey,
  isbnFieldsMatch,
  normalizeIsbn,
  normalizeTitle,
  titlesMatch,
} from "./bookIdentity";
import type { Book } from "./types";

describe("bookIdentity", () => {
  it("normalizes ISBN spreadsheet wrappers", () => {
    assert.equal(normalizeIsbn('="9780743273565"'), "9780743273565");
    assert.equal(normalizeIsbn("978-0-7432-7356-5"), "9780743273565");
  });

  it("matches books by ISBN13", () => {
    const a: Book = {
      id: "googlebooks:abc",
      title: "The Toll",
      author: "Neal Shusterman",
      coverUrl: "https://example.com/a.jpg",
      totalPages: 100,
      genres: [],
      description: "",
      isbn13: "9781534434934",
    };
    const b: Book = {
      ...a,
      id: "goodreads-import:999",
      title: "The Toll (Arc of a Scythe, #3)",
      coverUrl: "https://placehold.co/x",
    };
    assert.ok(isbnFieldsMatch(a, b));
    assert.equal(getBookMatchKey(a), getBookMatchKey(b));
  });

  it("matches books by normalized title and author when ISBN absent", () => {
    const a: Book = {
      id: "googlebooks:vol1",
      title: "The Toll",
      author: "Neal Shusterman",
      coverUrl: "https://example.com/a.jpg",
      totalPages: 100,
      genres: [],
      description: "",
    };
    const b: Book = {
      ...a,
      id: "goodreads-import:gr1",
      title: "The Toll (Arc of a Scythe, #3)",
    };
    assert.equal(getBookMatchKey(a), getBookMatchKey(b));
    assert.ok(titlesMatch(normalizeTitle(a.title), normalizeTitle(b.title)));
  });
});
