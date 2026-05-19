import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseOpenLibrarySubjects } from "./openLibrarySubjects";
import {
  mapSegmentsToCanonical,
  tokenizeOpenLibrarySubject,
} from "./openLibraryBisac";

describe("tokenizeOpenLibrarySubject", () => {
  it("splits BISAC paths on slash", () => {
    const { segments, fictionSignal } = tokenizeOpenLibrarySubject(
      "JUVENILE FICTION / Action & Adventure / General",
    );
    assert.equal(fictionSignal, true);
    assert.deepEqual(segments, ["JUVENILE FICTION", "Action & Adventure"]);
  });

  it("splits LOC --Fiction into theme segment", () => {
    const { segments, fictionSignal } = tokenizeOpenLibrarySubject("Death--Fiction");
    assert.equal(fictionSignal, true);
    assert.deepEqual(segments, ["Death"]);
  });
});

describe("mapSegmentsToCanonical", () => {
  it("maps BISAC segments to canonical labels", () => {
    const genres = mapSegmentsToCanonical(["JUVENILE FICTION", "Action & Adventure"]);
    assert.ok(genres.includes("Young adult"));
    assert.ok(genres.includes("Adventure"));
    assert.ok(!genres.some((g) => g.includes("/")));
  });
});

describe("parseOpenLibrarySubjects", () => {
  it("maps juvenile BISAC path without full path string", () => {
    const genres = parseOpenLibrarySubjects([
      "JUVENILE FICTION / Action & Adventure / General",
    ]);
    assert.ok(genres.includes("Young adult"));
    assert.ok(genres.includes("Adventure"));
    assert.ok(!genres.some((g) => g.includes("/")));
    assert.ok(!genres.includes("General"));
  });

  it("dedupes science fiction with trailing period", () => {
    const genres = parseOpenLibrarySubjects(["Science fiction", "Science fiction."]);
    assert.equal(genres.filter((g) => g === "Science fiction").length, 1);
  });

  it("maps Death--Fiction without literal LOC string", () => {
    const genres = parseOpenLibrarySubjects(["Death--Fiction"]);
    assert.ok(!genres.some((g) => g.includes("--")));
    assert.ok(genres.includes("Horror") || genres.includes("Fiction"));
  });

  it("maps Murder--Fiction to mystery or fiction", () => {
    const genres = parseOpenLibrarySubjects(["Murder--Fiction"]);
    assert.ok(!genres.some((g) => g.toLowerCase().includes("murder--")));
    assert.ok(genres.includes("Mystery") || genres.includes("Fiction"));
  });

  it("drops award metadata", () => {
    const genres = parseOpenLibrarySubjects(["award:hugo_award=novel", "Science fiction"]);
    assert.ok(!genres.some((g) => g.startsWith("award:")));
    assert.ok(genres.includes("Science fiction"));
  });

  it("maps plain romance and historical subjects", () => {
    const genres = parseOpenLibrarySubjects([
      "Romance fiction",
      "Historical fiction",
      "England -- Social life and customs -- 19th century -- Fiction",
    ]);
    assert.ok(genres.includes("Romance"));
    assert.ok(genres.includes("Historical fiction"));
    assert.ok(!genres.some((g) => g.includes("England")));
  });

  it("caps at six genres", () => {
    const genres = parseOpenLibrarySubjects([
      "Fantasy",
      "Science fiction",
      "Romance",
      "Mystery",
      "Horror",
      "Thriller",
      "Adventure",
      "Western",
    ]);
    assert.ok(genres.length <= 6);
  });
});
