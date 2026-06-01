import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseUrl,
  getSupabaseServiceRoleKey,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/**
 * Reading Nook social graph:
 *
 * **`follows`** — one-way edges (`follower_id` → `following_id`).
 *   - Following / followers counts come from these edges.
 *   - **Friends** (colloquial) = mutual follows — a label only, not a library gate.
 *
 * **`friendships`** — approval workflow for **private** accounts (`pending` | `accepted`).
 *   Accepting a request inserts a one-way follow (requester → owner) so the requester
 *   can view the private library. Public libraries are visible to any signed-in user.
 */

export type SocialProfileRow = {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  tagline: string;
};

function getServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  tagline: string | null;
};

function mapProfiles(rows: ProfileRow[]): Map<string, SocialProfileRow> {
  return new Map(
    rows.map((p) => [
      p.id,
      {
        userId: p.id,
        username: p.username ?? null,
        displayName: p.display_name ?? "Reader",
        avatarUrl: p.avatar_url ?? null,
        tagline: p.tagline ?? "",
      },
    ]),
  );
}

/** Directional counts from the `follows` table (can differ). */
export async function countFollowDirections(
  userId: string,
): Promise<{ following: number; followers: number }> {
  const sb = getServiceClient();
  if (!sb) return { following: 0, followers: 0 };

  const [followingRes, followersRes] = await Promise.all([
    sb.from("follows").select("follower_id", { count: "exact", head: true }).eq("follower_id", userId),
    sb.from("follows").select("following_id", { count: "exact", head: true }).eq("following_id", userId),
  ]);

  return {
    following: followingRes.count ?? 0,
    followers: followersRes.count ?? 0,
  };
}

export async function areMutualFollows(userA: string, userB: string): Promise<boolean> {
  const [aFollowsB, bFollowsA] = await Promise.all([
    viewerFollowsTarget(userA, userB),
    viewerFollowsTarget(userB, userA),
  ]);
  return aFollowsB && bFollowsA;
}

export async function viewerFollowsTarget(
  viewerId: string,
  targetUserId: string,
): Promise<boolean> {
  const sb = getServiceClient();
  if (!sb) return false;
  const { data } = await sb
    .from("follows")
    .select("follower_id")
    .eq("follower_id", viewerId)
    .eq("following_id", targetUserId)
    .maybeSingle();
  return Boolean(data);
}

/** Users this account follows (outgoing follow edges). */
export async function listFollowingForUser(userId: string): Promise<SocialProfileRow[]> {
  const sb = getServiceClient();
  if (!sb) return [];

  const { data: edges } = await sb
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const ids = (edges ?? []).map((e) => String(e.following_id)).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url, tagline")
    .in("id", ids);

  const map = mapProfiles((profiles ?? []) as ProfileRow[]);
  return ids.map((id) => map.get(id)).filter((p): p is SocialProfileRow => Boolean(p));
}

/**
 * Friends = users with reciprocated follows (mutual follow).
 */
export async function listMutualFollowsForUser(userId: string): Promise<SocialProfileRow[]> {
  const [following, followers] = await Promise.all([
    listFollowingForUser(userId),
    listFollowersForUser(userId),
  ]);
  const followingIds = new Set(following.map((p) => p.userId));
  return followers.filter((p) => followingIds.has(p.userId));
}

/** Users who follow this account (incoming follow edges). */
export async function listFollowersForUser(userId: string): Promise<SocialProfileRow[]> {
  const sb = getServiceClient();
  if (!sb) return [];

  const { data: edges } = await sb
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId);

  const ids = (edges ?? []).map((e) => String(e.follower_id)).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: profiles } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url, tagline")
    .in("id", ids);

  const map = mapProfiles((profiles ?? []) as ProfileRow[]);
  return ids.map((id) => map.get(id)).filter((p): p is SocialProfileRow => Boolean(p));
}

/** After accepting a friend request, ensure both users follow each other. */
export async function ensureMutualFollows(
  userA: string,
  userB: string,
): Promise<void> {
  const sb = getServiceClient();
  if (!sb || userA === userB) return;

  const rows = [
    { follower_id: userA, following_id: userB },
    { follower_id: userB, following_id: userA },
  ];
  for (const row of rows) {
    const { error } = await sb.from("follows").insert(row);
    if (error && error.code !== "23505") {
      return;
    }
  }
}

export async function insertFollow(
  followerId: string,
  followingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (followerId === followingId) {
    return { ok: false, error: "You cannot follow yourself." };
  }
  const sb = getServiceClient();
  if (!sb) return { ok: false, error: "Supabase not configured." };

  const { error } = await sb.from("follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteFollow(
  followerId: string,
  followingId: string,
): Promise<void> {
  const sb = getServiceClient();
  if (!sb) return;
  await sb
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}
