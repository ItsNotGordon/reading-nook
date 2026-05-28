import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectAcceptedFriendLinks } from "./friendshipCounts";

describe("collectAcceptedFriendLinks", () => {
  const me = "user-a";

  it("returns both sides of accepted friendships (symmetric friend graph)", () => {
    const links = collectAcceptedFriendLinks(me, [
      { requester_id: me, addressee_id: "user-b" },
      { requester_id: "user-c", addressee_id: me },
    ]);
    assert.equal(links.length, 2);
    assert.deepEqual(
      links.map((l) => l.friendId).sort(),
      ["user-b", "user-c"],
    );
    const outgoing = links.find((l) => l.friendId === "user-b");
    const incoming = links.find((l) => l.friendId === "user-c");
    assert.equal(outgoing?.direction, "outgoing");
    assert.equal(incoming?.direction, "incoming");
  });

  it("deduplicates duplicate rows for the same friend", () => {
    const links = collectAcceptedFriendLinks(me, [
      { requester_id: me, addressee_id: "user-b" },
      { requester_id: me, addressee_id: "user-b" },
    ]);
    assert.equal(links.length, 1);
    assert.equal(links[0]?.friendId, "user-b");
  });

  it("excludes self-referential rows", () => {
    const links = collectAcceptedFriendLinks(me, [
      { requester_id: me, addressee_id: me },
      { requester_id: me, addressee_id: "user-b" },
    ]);
    assert.equal(links.length, 1);
    assert.equal(links[0]?.friendId, "user-b");
  });
});
