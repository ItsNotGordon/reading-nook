import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mineWeightedApriori,
  recommendTargetGenres,
  runWeightedApriori,
} from "./weightedApriori";
import type { WeightedBasket, WeightedTasteProfile } from "./weightedTaste";

function profileWithBaskets(
  baskets: WeightedBasket[],
  affinity: Record<string, number>,
): WeightedTasteProfile {
  const genreAffinity = new Map(Object.entries(affinity));
  return {
    active: true,
    finishedWithSentiment: baskets.length,
    genreAffinity,
    positiveBaskets: baskets,
    finishedRows: [],
    totalPositiveWeight: baskets.reduce((s, b) => s + b.bookWeight, 0),
  };
}

describe("mineWeightedApriori", () => {
  it("weights frequency: many sci-fi books outweigh one romance", () => {
    const sciFiBaskets: WeightedBasket[] = [];
    for (let i = 0; i < 4; i += 1) {
      sciFiBaskets.push({
        bookId: `sf-${i}`,
        genres: ["science-fiction"],
        bookWeight: 3,
      });
    }
    sciFiBaskets.push({
      bookId: "rom-0",
      genres: ["romance"],
      bookWeight: 1,
    });

    const result = mineWeightedApriori(sciFiBaskets);
    const sfSupport = result.frequentSingles.get("science-fiction") ?? 0;
    const romSupport = result.frequentSingles.get("romance") ?? 0;
    assert.ok(sfSupport > romSupport);
    assert.equal(sfSupport, 12);
    assert.equal(romSupport, 1);
  });

  it("excludes disliked-only baskets from mining input", () => {
    const baskets: WeightedBasket[] = [
      { bookId: "1", genres: ["fantasy"], bookWeight: 3 },
    ];
    const profile = profileWithBaskets(baskets, { fantasy: 3, romance: -2 });
    const target = runWeightedApriori(profile);
    assert.ok(target.targetGenres.has("fantasy"));
    assert.ok(!target.targetGenres.has("romance") || profile.genreAffinity.get("romance")! <= 0);
  });
});

describe("recommendTargetGenres", () => {
  it("surfaces co-occurrence consequents for top affinity genres", () => {
    const baskets: WeightedBasket[] = [
      { bookId: "1", genres: ["science-fiction", "thriller"], bookWeight: 3 },
      { bookId: "2", genres: ["science-fiction", "thriller"], bookWeight: 3 },
      { bookId: "3", genres: ["science-fiction"], bookWeight: 3 },
    ];
    const profile = profileWithBaskets(baskets, {
      "science-fiction": 9,
      thriller: 6,
    });
    const apriori = mineWeightedApriori(baskets);
    const target = recommendTargetGenres(profile, apriori);
    assert.ok(target.targetGenres.has("science-fiction"));
  });
});
