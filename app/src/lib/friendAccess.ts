import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function assertAcceptedFriend(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  userId: string,
  friendId: string,
) {
  const { data: links, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) return { ok: false as const, status: 500, error: error.message };

  const link = (links ?? []).find(
    (row) =>
      (row.requester_id === userId && row.addressee_id === friendId) ||
      (row.requester_id === friendId && row.addressee_id === userId),
  );
  if (!link) return { ok: false as const, status: 403, error: "Not friends with this user." };
  return { ok: true as const };
}
