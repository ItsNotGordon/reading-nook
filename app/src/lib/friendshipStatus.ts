import type { SupabaseClient } from "@supabase/supabase-js";

export type FriendRelationship =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted";

export type FriendshipLink = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

export function relationshipWithViewer(
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
    return { relationship: "accepted", friendshipId: link.id };
  }
  if (link.addressee_id === viewerId) {
    return { relationship: "pending_incoming", friendshipId: link.id };
  }
  return { relationship: "pending_outgoing", friendshipId: link.id };
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
