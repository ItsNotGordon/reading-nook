import { NextResponse } from "next/server";
import { assertAcceptedFriend } from "@/lib/friendAccess";
import { buildFriendProfileSummary } from "@/lib/friendProfileSummary";
import { getInitialState, parseStoredState } from "@/lib/storage";
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
  const friendship = await assertAcceptedFriend(supabase, user.id, friendId);
  if (!friendship.ok) {
    return NextResponse.json({ error: friendship.error }, { status: friendship.status });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", friendId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const { data: lib, error: libError } = await supabase
    .from("libraries")
    .select("state")
    .eq("user_id", friendId)
    .maybeSingle();

  if (libError) {
    return NextResponse.json({ error: libError.message }, { status: 500 });
  }

  let friendState = getInitialState();
  if (lib?.state) {
    const raw = typeof lib.state === "string" ? lib.state : JSON.stringify(lib.state);
    const parsed = parseStoredState(raw);
    if (parsed) friendState = parsed;
  }

  return NextResponse.json({
    displayName: profile.display_name ?? "Reader",
    username: profile.username ?? null,
    ...buildFriendProfileSummary(friendState),
  });
}
