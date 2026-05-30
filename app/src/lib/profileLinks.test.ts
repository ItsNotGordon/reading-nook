import { describe, expect, it } from "vitest";
import {
  authorDisplayLabel,
  getProfileHref,
  profileLinkAriaLabel,
} from "./profileLinks";

describe("profileLinks", () => {
  const user = {
    userId: "u1",
    displayName: "Alex Reader",
    username: "alex",
  };

  it("routes self to /profile", () => {
    expect(getProfileHref(user, "u1")).toBe("/profile");
  });

  it("routes others with username to /friends/[username]", () => {
    expect(getProfileHref(user, "u2")).toBe("/friends/alex");
  });

  it("returns null when other user has no username", () => {
    expect(
      getProfileHref({ userId: "u1", displayName: "Alex", username: null }, "u2"),
    ).toBeNull();
  });

  it("prefers @username in display label", () => {
    expect(authorDisplayLabel(user)).toBe("@alex");
  });

  it("builds aria label for username profiles", () => {
    expect(profileLinkAriaLabel(user)).toBe("View @alex's profile");
  });
});
