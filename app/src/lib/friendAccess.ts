import { createSupabaseServerClient } from "@/lib/supabase/server";
import { areMutualFollows } from "@/lib/socialGraph";

/**
 * Library, taste, and profile summaries require **friends** = mutual follows.
 */
export async function assertMutualFollow(
  _supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string,
  friendId: string,
) {
  const mutual = await areMutualFollows(userId, friendId);
  if (!mutual) {
    return { ok: false as const, status: 403, error: "Not friends with this user." };
  }
  return { ok: true as const };
}

/** @deprecated Name kept for call sites — checks mutual follow, not friendship rows. */
export const assertAcceptedFriend = assertMutualFollow;
