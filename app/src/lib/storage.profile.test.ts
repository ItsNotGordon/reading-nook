import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyProfileDbFields, getInitialState } from "./storage";

describe("applyProfileDbFields", () => {
  it("overlays non-empty display_name and tagline from DB", () => {
    const state = getInitialState();
    const merged = applyProfileDbFields(state, "Alex", "Bookworm");
    assert.equal(merged.profile.displayName, "Alex");
    assert.equal(merged.profile.tagline, "Bookworm");
  });

  it("leaves state unchanged when DB fields are empty", () => {
    const state = getInitialState();
    state.profile.displayName = "Local";
    const merged = applyProfileDbFields(state, "", null);
    assert.equal(merged.profile.displayName, "Local");
  });
});
