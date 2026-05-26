import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeUsername } from "@/lib/username";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isSupabaseConfigured,
  getSupabaseUrl,
  getSupabaseServiceRoleKey,
} from "@/lib/supabase/config";

export async function GET(
  _request: Request,
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

  // Resolve username → user id via the viewer's client (RLS allows profile lookup)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const targetId = profile.id;

  // Use service-role to bypass RLS and see all friendships for this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sb: any;
  try {
    sb = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return NextResponse.json({ error: "Service config error." }, { status: 500 });
  }

  const { data: links, error } = await sb
    .from("friendships")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${targetId},addressee_id.eq.${targetId}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!links || links.length === 0) {
    return NextResponse.json({ friends: [] });
  }

  type FriendLink = { requester_id: string; addressee_id: string };

  const friendEntries = (links as FriendLink[]).map((link) => {
    const isRequester = link.requester_id === targetId;
    return {
      friendId: isRequester ? link.addressee_id : link.requester_id,
      direction: isRequester ? "outgoing" : "incoming",
    };
  });

  const friendIds = friendEntries.map((e) => e.friendId);

  // Fetch profiles for all friends (service role, no RLS)
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url, tagline")
    .in("id", friendIds);

  type FriendProfile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null; tagline: string | null };

  const profileMap = new Map(
    ((profiles ?? []) as FriendProfile[]).map((p) => [p.id, p]),
  );

  const friends = friendEntries.map((entry) => {
    const p = profileMap.get(entry.friendId);
    return {
      userId: entry.friendId,
      username: p?.username ?? null,
      displayName: p?.display_name ?? "Reader",
      avatarUrl: p?.avatar_url ?? null,
      tagline: p?.tagline ?? "",
      direction: entry.direction,
    };
  });

  return NextResponse.json({ friends });
}
