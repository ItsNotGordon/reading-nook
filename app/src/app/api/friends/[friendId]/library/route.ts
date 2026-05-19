import { NextResponse } from "next/server";
import type { AppState } from "@/lib/types";
import { listFriendShelfBooks } from "@/lib/friendLibrary";
import { parseStoredState } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function assertAcceptedFriend(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string, friendId: string) {
  if (!supabase) return { ok: false as const, status: 503, error: "Friends require Supabase." };
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ friendId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Friends require Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Friends require Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { friendId } = await context.params;
  const friendship = await assertAcceptedFriend(supabase, user.id, friendId);
  if (!friendship.ok) {
    return NextResponse.json({ error: friendship.error }, { status: friendship.status });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, share_shelves")
    .eq("id", friendId)
    .maybeSingle();

  if (!profile?.share_shelves) {
    return NextResponse.json({
      displayName: profile?.display_name ?? "Reader",
      shareShelves: false,
      books: [],
    });
  }

  const { data: lib, error: libError } = await supabase
    .from("libraries")
    .select("state")
    .eq("user_id", friendId)
    .maybeSingle();

  if (libError) {
    return NextResponse.json({ error: libError.message }, { status: 500 });
  }

  let friendState: AppState | null = null;
  if (lib?.state) {
    const raw = typeof lib.state === "string" ? lib.state : JSON.stringify(lib.state);
    friendState = parseStoredState(raw);
  }

  return NextResponse.json({
    displayName: profile.display_name ?? "Reader",
    shareShelves: true,
    books: friendState ? listFriendShelfBooks(friendState) : [],
  });
}
