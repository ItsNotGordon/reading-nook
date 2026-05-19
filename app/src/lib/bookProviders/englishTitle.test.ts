import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import {
  looksNonEnglishTitle,
  resolveEnglishDisplayTitle,
  withEnglishLanguageQuery,
} from "./englishTitle";

describe("looksNonEnglishTitle", () => {
  it("flags Spanish-style titles", () => {
    assert.equal(looksNonEnglishTitle("Una corte de niebla y furia"), true);
    assert.equal(looksNonEnglishTitle("El nombre del viento"), true);
  });

  it("flags accented titles", () => {
    assert.equal(looksNonEnglishTitle("Un Palais de colère et de brume"), true);
  });

  it("leaves obvious English titles alone", () => {
    assert.equal(looksNonEnglishTitle("Haunting Adeline"), false);
    assert.equal(looksNonEnglishTitle("It Ends With Us"), false);
    assert.equal(looksNonEnglishTitle("Harry Potter and the Philosopher's Stone"), false);
  });
});

describe("withEnglishLanguageQuery", () => {
  it("appends language:eng when missing", () => {
    assert.equal(withEnglishLanguageQuery('subject:"Romance"'), 'subject:"Romance" language:eng');
  });

  it("does not duplicate language:eng", () => {
    assert.equal(withEnglishLanguageQuery("fantasy language:eng"), "fantasy language:eng");
  });
});

describe("resolveEnglishDisplayTitle", () => {
  it("returns fallback when title looks English", async () => {
    const title = await resolveEnglishDisplayTitle("openlibrary:OL1W", "It Ends With Us");
    assert.equal(title, "It Ends With Us");
  });

  it("uses translation_of from editions API", async () => {
    const mockFetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        size: 1,
        entries: [
          {
            title: "Una corte de niebla y furia",
            languages: [{ key: "/languages/spa" }],
            translation_of: "A Court of Mist and Fury",
          },
        ],
      }),
    }));
    const original = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    try {
      const title = await resolveEnglishDisplayTitle(
        "openlibrary:OL17860744W",
        "Una corte de niebla y furia",
      );
      assert.equal(title, "A Court of Mist and Fury");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("prefers English edition title when present", async () => {
    const mockFetch = mock.fn(async () => ({
      ok: true,
      json: async () => ({
        size: 2,
        entries: [
          {
            title: "Una corte de niebla y furia",
            languages: [{ key: "/languages/spa" }],
          },
          {
            title: "A Court of Mist and Fury",
            languages: [{ key: "/languages/eng" }],
          },
        ],
      }),
    }));
    const original = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    try {
      const title = await resolveEnglishDisplayTitle(
        "openlibrary:OL99999W",
        "Una corte de niebla y furia",
      );
      assert.equal(title, "A Court of Mist and Fury");
    } finally {
      globalThis.fetch = original;
    }
  });
});
