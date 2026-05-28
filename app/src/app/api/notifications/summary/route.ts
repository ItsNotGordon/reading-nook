import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ friends: 0, clubs: 0 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ friends: 0, clubs: 0 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ friends: 0, clubs: 0 });

  const { count: friendsCount, error: friendsError } = await sb
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (friendsError) {
    return NextResponse.json({ error: friendsError.message }, { status: 500 });
  }

  const { count: clubAddedCount, error: clubAddedError } = await sb
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("type", "club_added")
    .is("read_at", null);

  if (clubAddedError) {
    return NextResponse.json({ error: clubAddedError.message }, { status: 500 });
  }

  const { data: memberships, error: membersError } = await sb
    .from("club_members")
    .select("club_id, last_feed_seen_at")
    .eq("user_id", user.id);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  let clubFeedUnread = 0;
  const memberRows = memberships ?? [];
  if (memberRows.length > 0) {
    const seenByClub = new Map(
      memberRows.map((m) => [m.club_id as string, m.last_feed_seen_at as string]),
    );
    const clubIds = [...seenByClub.keys()];

    const { data: clubPosts, error: postsError } = await sb
      .from("posts")
      .select("club_id, created_at, user_id")
      .in("club_id", clubIds)
      .neq("user_id", user.id);

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    for (const post of clubPosts ?? []) {
      if (!post.club_id) continue;
      const seenAt = seenByClub.get(post.club_id);
      if (!seenAt) continue;
      if (new Date(post.created_at).getTime() > new Date(seenAt).getTime()) {
        clubFeedUnread += 1;
      }
    }
  }

  const friends = friendsCount ?? 0;
  const clubs = (clubAddedCount ?? 0) + clubFeedUnread;

  return NextResponse.json({ friends, clubs });
}
