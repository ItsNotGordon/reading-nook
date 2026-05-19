import { NextResponse } from "next/server";
import type { AppState } from "@/lib/types";
import { parseStoredState } from "@/lib/storage";
import { buildTasteComparison, friendShelfCounts } from "@/lib/tasteComparison";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

  const { data: links, error: linkError } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  const link = (links ?? []).find(
    (row) =>
      (row.requester_id === user.id && row.addressee_id === friendId) ||
      (row.requester_id === friendId && row.addressee_id === user.id),
  );
  if (!link) {
    return NextResponse.json({ error: "Not friends with this user." }, { status: 403 });
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
      shelfCounts: null,
      comparison: null,
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

  const { data: mine } = await supabase
    .from("libraries")
    .select("state")
    .eq("user_id", user.id)
    .maybeSingle();

  let friendState: AppState | null = null;
  if (lib?.state) {
    const raw = typeof lib.state === "string" ? lib.state : JSON.stringify(lib.state);
    friendState = parseStoredState(raw);
  }

  let yourState: AppState | null = null;
  if (mine?.state) {
    const raw = typeof mine.state === "string" ? mine.state : JSON.stringify(mine.state);
    yourState = parseStoredState(raw);
  }

  const shelfCounts = friendState ? friendShelfCounts(friendState) : null;
  const comparison =
    friendState && yourState ? buildTasteComparison(yourState, friendState) : null;

  return NextResponse.json({
    displayName: profile.display_name ?? "Reader",
    shareShelves: true,
    shelfCounts,
    comparison,
  });
}
