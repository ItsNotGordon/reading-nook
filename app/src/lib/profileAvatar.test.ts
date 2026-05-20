import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateAvatarFile } from "./profileAvatar";

describe("profileAvatar", () => {
  it("validates file type and size", () => {
    const ok = validateAvatarFile({
      type: "image/jpeg",
      size: 1024,
    } as File);
    assert.equal(ok.ok, true);

    const badType = validateAvatarFile({ type: "image/gif", size: 100 } as File);
    assert.equal(badType.ok, false);

    const tooBig = validateAvatarFile({ type: "image/png", size: 6 * 1024 * 1024 } as File);
    assert.equal(tooBig.ok, false);
  });
});
