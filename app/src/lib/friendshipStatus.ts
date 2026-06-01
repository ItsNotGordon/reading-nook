import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `friendships` = private-account approval requests (pending | accepted row).
 * **Friends** in product terms = mutual follows — colloquial label only; library access
 * uses public/private profile rules in `friendAccess.ts`.
 */

export type FriendRelationship =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "following"
  | "follower"
  | "friends";

export type FriendshipLink = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

/** Pending friend-request row only (ignores follow graph). */
export function friendshipRequestWithViewer(
  viewerId: string,
  targetUserId: string,
  links: FriendshipLink[],
): { relationship: FriendRelationship; friendshipId: string | null } {
  const link = links.find(
    (row) =>
      (row.requester_id === viewerId && row.addressee_id === targetUserId) ||
      (row.requester_id === targetUserId && row.addressee_id === viewerId),
  );
  if (!link) return { relationship: "none", friendshipId: null };
  if (link.status === "accepted") {
    return { relationship: "none", friendshipId: link.id };
  }
  if (link.addressee_id === viewerId) {
    return { relationship: "pending_incoming", friendshipId: link.id };
  }
  return { relationship: "pending_outgoing", friendshipId: link.id };
}

/** Viewer ↔ target relationship from follows + optional pending friend request. */
export function resolveSocialRelationship(
  viewerId: string,
  targetUserId: string,
  links: FriendshipLink[],
  mutualFollow: boolean,
  viewerFollows: boolean,
  targetFollowsViewer: boolean,
): { relationship: FriendRelationship; friendshipId: string | null } {
  const link = links.find(
    (row) =>
      (row.requester_id === viewerId && row.addressee_id === targetUserId) ||
      (row.requester_id === targetUserId && row.addressee_id === viewerId),
  );
  const friendshipId = link?.id ?? null;

  if (mutualFollow) {
    return { relationship: "friends", friendshipId };
  }

  if (link?.status === "pending") {
    if (link.addressee_id === viewerId) {
      return { relationship: "pending_incoming", friendshipId };
    }
    return { relationship: "pending_outgoing", friendshipId };
  }

  if (viewerFollows) {
    return { relationship: "following", friendshipId };
  }
  if (targetFollowsViewer) {
    return { relationship: "follower", friendshipId };
  }

  return { relationship: "none", friendshipId };
}

/** @deprecated Use resolveSocialRelationship with follow flags. */
export function relationshipWithViewer(
  viewerId: string,
  targetUserId: string,
  links: FriendshipLink[],
): { relationship: FriendRelationship; friendshipId: string | null } {
  return friendshipRequestWithViewer(viewerId, targetUserId, links);
}

export async function findFriendshipBetween(
  supabase: SupabaseClient,
  userA: string,
  userB: string,
): Promise<{ links: FriendshipLink[]; error: string | null }> {
  const { data, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(
      `and(requester_id.eq.${userA},addressee_id.eq.${userB}),and(requester_id.eq.${userB},addressee_id.eq.${userA})`,
    );
  if (error) return { links: [], error: error.message };
  return { links: data ?? [], error: null };
}
