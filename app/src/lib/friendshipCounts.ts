import type { SupabaseClient } from "@supabase/supabase-js";

/** Count accepted friendships for a user (symmetric Following / Followers display). */
export async function countAcceptedFriendships(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) return 0;
  return count ?? 0;
}
