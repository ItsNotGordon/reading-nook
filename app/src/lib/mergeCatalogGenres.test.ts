import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeCatalogGenres, sanitizeCatalogGenres } from "./mergeCatalogGenres";

describe("mergeCatalogGenres", () => {
  it("merges OL and user genres with dedupe", () => {
    const merged = mergeCatalogGenres(
      ["Science fiction", "Fantasy"],
      ["Science fiction", "Adventure"],
    );
    assert.deepEqual(merged, ["Science fiction", "Fantasy", "Adventure"]);
  });

  it("caps at six genres", () => {
    const merged = mergeCatalogGenres(
      ["Fantasy", "Romance", "Mystery", "Horror"],
      ["Thriller", "Adventure", "Western"],
    );
    assert.equal(merged.length, 6);
  });

  it("drops labels not on allowlist", () => {
    const merged = mergeCatalogGenres([], ["Not A Real Genre", "Fantasy"]);
    assert.deepEqual(merged, ["Fantasy"]);
  });
});

describe("sanitizeCatalogGenres", () => {
  it("normalizes and filters user edit selections", () => {
    const out = sanitizeCatalogGenres(["Science fiction", "Fantasy", "junk tag"]);
    assert.ok(out.includes("Science fiction"));
    assert.ok(out.includes("Fantasy"));
    assert.ok(!out.some((g) => g.includes("junk")));
  });
});
