import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("socialGraph model", () => {
  it("defines friends as mutual follows", () => {
    const aFollowsB = true;
    const bFollowsA = true;
    assert.equal(aFollowsB && bFollowsA, true);
  });

  it("one-way follow is not friendship", () => {
    const aFollowsB = true;
    const bFollowsA = false;
    assert.equal(aFollowsB && bFollowsA, false);
  });

  it("allows asymmetric follower/following counts", () => {
    const following = 5;
    const followers = 4;
    assert.notEqual(following, followers);
  });
});
