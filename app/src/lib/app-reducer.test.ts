import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appReducer } from "./app-reducer";
import { defaultUserProfile, getInitialState } from "./storage";
import type { AppState } from "./types";

function stateWithProfile(name: string, tagline: string): AppState {
  return {
    ...getInitialState(),
    profile: { displayName: name, tagline, theme: "plant" },
  };
}

describe("appReducer session reset", () => {
  it("RESET_SESSION clears profile to defaults", () => {
    const before = stateWithProfile("Gordon", "My bio");
    const after = appReducer(before, { type: "RESET_SESSION" });
    const d = defaultUserProfile();
    assert.equal(after.profile.displayName, d.displayName);
    assert.equal(after.profile.tagline, d.tagline);
    assert.equal(Object.keys(after.userBooks).length, 0);
  });

  it("RESET_LIBRARY keeps profile but clears shelves", () => {
    const before = stateWithProfile("Gordon", "My bio");
    const after = appReducer(before, { type: "RESET_LIBRARY" });
    assert.equal(after.profile.displayName, "Gordon");
    assert.equal(after.profile.tagline, "My bio");
    assert.equal(Object.keys(after.userBooks).length, 0);
  });
});
