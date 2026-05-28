import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseUrl,
  getSupabaseServiceRoleKey,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export type AcceptedFriendLink = {
  friendId: string;
  direction: "incoming" | "outgoing";
};

export type AcceptedFriendProfile = {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  tagline: string;
  direction: "incoming" | "outgoing";
};

function getServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

type FriendshipRow = { requester_id: string; addressee_id: string };

/** Pure helper: map accepted friendship rows to unique friend links. */
export function collectAcceptedFriendLinks(
  userId: string,
  rows: FriendshipRow[],
): AcceptedFriendLink[] {
  const seen = new Set<string>();
  const result: AcceptedFriendLink[] = [];

  for (const link of rows) {
    const requesterId = String(link.requester_id);
    const addresseeId = String(link.addressee_id);
    const friendId = requesterId === userId ? addresseeId : requesterId;
    if (!friendId || friendId === userId || seen.has(friendId)) continue;
    seen.add(friendId);
    result.push({
      friendId,
      direction: requesterId === userId ? "outgoing" : "incoming",
    });
  }

  return result;
}

/**
 * Accepted friend user IDs for a user (mutual friends graph).
 * Uses service role so counts are not limited by viewer RLS.
 */
export async function getAcceptedFriendshipsForUser(
  userId: string,
): Promise<AcceptedFriendLink[]> {
  const sb = getServiceClient();
  if (!sb) return [];

  const { data: links, error } = await sb
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error || !links) return [];

  return collectAcceptedFriendLinks(userId, links as FriendshipRow[]);
}

export async function getAcceptedFriendIdsForUser(userId: string): Promise<string[]> {
  const links = await getAcceptedFriendshipsForUser(userId);
  return links.map((l) => l.friendId);
}

/**
 * Symmetric tallies: accepted friends count for both followers and following.
 */
export async function countAcceptedFriendships(
  _supabase: SupabaseClient,
  userId: string,
): Promise<{ following: number; followers: number }> {
  const n = (await getAcceptedFriendshipsForUser(userId)).length;
  return { following: n, followers: n };
}

/** Full accepted friend list with profile fields (service role). */
export async function listAcceptedFriendsForUser(
  userId: string,
): Promise<AcceptedFriendProfile[]> {
  const links = await getAcceptedFriendshipsForUser(userId);
  if (links.length === 0) return [];

  const sb = getServiceClient();
  if (!sb) return [];

  const friendIds = links.map((l) => l.friendId);
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url, tagline")
    .in("id", friendIds);

  type ProfileRow = {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    tagline: string | null;
  };

  const profileMap = new Map(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  );

  return links.map((link) => {
    const p = profileMap.get(link.friendId);
    return {
      userId: link.friendId,
      username: p?.username ?? null,
      displayName: p?.display_name ?? "Reader",
      avatarUrl: p?.avatar_url ?? null,
      tagline: p?.tagline ?? "",
      direction: link.direction,
    };
  });
}
