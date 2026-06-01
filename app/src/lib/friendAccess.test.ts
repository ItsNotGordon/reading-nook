import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canViewLibrary } from "./friendAccess";

describe("canViewLibrary", () => {
  const viewer = "viewer-1";
  const target = "target-2";

  it("allows self", () => {
    assert.equal(
      canViewLibrary({
        viewerId: viewer,
        targetId: viewer,
        targetIsPublic: false,
        viewerFollowsTarget: false,
      }),
      true,
    );
  });

  it("allows any viewer for public accounts", () => {
    assert.equal(
      canViewLibrary({
        viewerId: viewer,
        targetId: target,
        targetIsPublic: true,
        viewerFollowsTarget: false,
      }),
      true,
    );
  });

  it("allows approved follower on private accounts", () => {
    assert.equal(
      canViewLibrary({
        viewerId: viewer,
        targetId: target,
        targetIsPublic: false,
        viewerFollowsTarget: true,
      }),
      true,
    );
  });

  it("denies stranger on private accounts", () => {
    assert.equal(
      canViewLibrary({
        viewerId: viewer,
        targetId: target,
        targetIsPublic: false,
        viewerFollowsTarget: false,
      }),
      false,
    );
  });
});
