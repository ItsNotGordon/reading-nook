import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPopularityScoreMap,
  popularityBottomThreshold,
  rawPopularityWeight,
} from "./popularityScore";

describe("rawPopularityWeight", () => {
  it("ranks higher readinglog above low counts", () => {
    assert.ok(rawPopularityWeight(10000, 100) > rawPopularityWeight(5, 0));
  });
});

describe("buildPopularityScoreMap", () => {
  it("normalizes within batch", () => {
    const map = buildPopularityScoreMap([
      { bookId: "a", readinglogCount: 100 },
      { bookId: "b", readinglogCount: 10000 },
    ]);
    assert.ok((map.get("b") ?? 0) > (map.get("a") ?? 0));
    assert.equal(map.get("b"), 1);
  });
});

describe("popularityBottomThreshold", () => {
  it("returns low percentile value", () => {
    const t = popularityBottomThreshold([0.1, 0.2, 0.5, 0.9, 1], 0.4);
    assert.ok(t <= 0.5);
  });
});
