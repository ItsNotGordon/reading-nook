import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FinishedBookRow } from "./weightedTaste";
import { predictLikeScore } from "./sentimentKnn";

function finishedRow(
  id: string,
  genres: string[],
  sentiment: "liked" | "okay" | "disliked",
  author = "author a",
): FinishedBookRow {
  const genreKeys = genres.map((g) => g.toLowerCase());
  return {
    bookId: id,
    title: id,
    author,
    authorKey: author.toLowerCase(),
    genres: genreKeys,
    genreKeys,
    sentiment,
    bookWeight: sentiment === "liked" ? 3 : sentiment === "okay" ? 1 : 0,
    knnLabel: sentiment === "liked" ? 1 : sentiment === "okay" ? 0.5 : 0,
  };
}

describe("predictLikeScore", () => {
  it("scores higher for candidates similar to liked books", () => {
    const training = [
      finishedRow("1", ["science-fiction"], "liked"),
      finishedRow("2", ["science-fiction"], "liked"),
      finishedRow("3", ["science-fiction"], "liked"),
    ];
    const sfScore = predictLikeScore(training, {
      genreKeys: ["science-fiction"],
      authorKey: "other",
    });
    const romScore = predictLikeScore(training, {
      genreKeys: ["romance"],
      authorKey: "other",
    });
    assert.ok(sfScore.score > romScore.score);
  });

  it("scores lower near disliked romance than unrelated genres", () => {
    const training = [
      finishedRow("1", ["science-fiction"], "liked"),
      finishedRow("2", ["science-fiction"], "liked"),
      finishedRow("3", ["romance"], "disliked"),
    ];
    const romScore = predictLikeScore(training, {
      genreKeys: ["romance"],
      authorKey: "other",
    });
    const mysteryScore = predictLikeScore(training, {
      genreKeys: ["mystery"],
      authorKey: "other",
    });
    assert.ok(mysteryScore.score >= romScore.score);
  });
});
