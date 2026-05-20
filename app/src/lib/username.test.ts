import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeUsername, validateUsername } from "./username";

describe("username", () => {
  it("normalizes and validates", () => {
    assert.equal(normalizeUsername("@Alice"), "alice");
    assert.equal(validateUsername("ab").ok, false);
    const valid = validateUsername("valid_user");
    assert.equal(valid.ok, true);
    if (valid.ok) assert.equal(valid.username, "valid_user");
    assert.equal(validateUsername("Bad-Name").ok, false);
  });
});
