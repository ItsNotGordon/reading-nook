import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey, isSupabaseConfigured } from "@/lib/supabase/config";

function getServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

/**
 * Count accepted friendships for any user, bypassing RLS so we can see
 * all of their connections (not just the ones shared with the viewer).
 */
export async function countAcceptedFriendships(
  _supabase: SupabaseClient,
  userId: string,
): Promise<{ following: number; followers: number }> {
  const sb = getServiceClient();
  if (!sb) return { following: 0, followers: 0 };

  const [totalRes, followersRes] = await Promise.all([
    sb
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    sb
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .eq("addressee_id", userId),
  ]);

  return {
    following: totalRes.count ?? 0,
    followers: followersRes.count ?? 0,
  };
}
