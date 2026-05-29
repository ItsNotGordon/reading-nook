import { NextResponse } from "next/server";
import {
  listFollowingForUser,
  listFollowersForUser,
  listMutualFollowsForUser,
} from "@/lib/socialGraph";
import { normalizeUsername } from "@/lib/username";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase required." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase required." }, { status: 503 });
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

  const { searchParams } = new URL(request.url);
  const listType = searchParams.get("list");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (listType === "friends") {
    const users = await listMutualFollowsForUser(profile.id);
    return NextResponse.json({ users });
  }
  if (listType === "following") {
    const users = await listFollowingForUser(profile.id);
    return NextResponse.json({ users });
  }
  if (listType === "followers") {
    const users = await listFollowersForUser(profile.id);
    return NextResponse.json({ users });
  }

  const [following, followers] = await Promise.all([
    listFollowingForUser(profile.id),
    listFollowersForUser(profile.id),
  ]);

  return NextResponse.json({ following, followers });
}
