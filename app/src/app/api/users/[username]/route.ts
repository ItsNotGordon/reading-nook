import { NextResponse } from "next/server";
import { findFriendshipBetween, relationshipWithViewer } from "@/lib/friendshipStatus";
import { normalizeUsername } from "@/lib/username";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Profiles require Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Profiles require Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { username: raw } = await context.params;
  const username = normalizeUsername(raw);
  if (!username) {
    return NextResponse.json({ error: "Username required." }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, tagline, share_shelves, avatar_url")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { links, error: linkError } = await findFriendshipBetween(supabase, user.id, profile.id);
  if (linkError) {
    return NextResponse.json({ error: linkError }, { status: 500 });
  }

  const { relationship, friendshipId } = relationshipWithViewer(user.id, profile.id, links);

  return NextResponse.json({
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name ?? "Reader",
    avatarUrl: profile.avatar_url ?? null,
    tagline: profile.tagline ?? "",
    shareShelves: Boolean(profile.share_shelves),
    relationship,
    friendshipId,
  });
}
