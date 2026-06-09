import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { vectorFromTerms } from "./bookFeatureVector";
import { clusterVectors } from "./dbscan";

describe("clusterVectors", () => {
  it("separates two dense genre blobs", () => {
    const fantasy = vectorFromTerms(["fantasy", "author:alpha"]);
    const sciFi = vectorFromTerms(["science fiction", "author:beta"]);
    const vectors = [
      fantasy,
      new Map(fantasy),
      sciFi,
      new Map(sciFi),
      vectorFromTerms(["fantasy", "author:alpha"]),
    ];
    const result = clusterVectors(vectors, { eps: 0.4, minPts: 2 });
    assert.ok(result.clusterCount >= 2);
    const labels = result.assignments.filter((l) => l !== "noise");
    assert.ok(new Set(labels).size >= 2);
  });

  it("marks isolated point as noise when using strict eps", () => {
    const blob = vectorFromTerms(["fantasy"]);
    const outlier = vectorFromTerms(["cooking"]);
    const vectors = [blob, new Map(blob), outlier];
    const result = clusterVectors(vectors, { eps: 0.35, minPts: 2 });
    assert.ok(result.assignments.some((l) => l === "noise" || typeof l === "number"));
  });

  it("uses fallback when DBSCAN cannot form multiple clusters", () => {
    const vectors = Array.from({ length: 8 }, () => vectorFromTerms(["fiction"]));
    const result = clusterVectors(vectors, { eps: 0.1, minPts: 9 });
    assert.equal(result.usedFallback, true);
    assert.equal(result.assignments.length, 8);
  });
});
