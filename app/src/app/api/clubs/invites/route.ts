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
    return NextResponse.json({ invites: [] });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ invites: [] });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ invites: [] });

  const { data: rows, error } = await sb
    .from("club_invites")
    .select("id, club_id, inviter_id, created_at")
    .eq("invitee_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const invites = [];
  for (const row of rows ?? []) {
    const { data: club } = await sb
      .from("clubs")
      .select("name, icon_url")
      .eq("id", row.club_id)
      .maybeSingle();

    const { data: inviter } = await sb
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", row.inviter_id)
      .maybeSingle();

    invites.push({
      inviteId: row.id,
      clubId: row.club_id,
      clubName: club?.name ?? "Club",
      clubIconUrl: club?.icon_url ?? null,
      inviterDisplayName: inviter?.display_name ?? "Reader",
      inviterUsername: inviter?.username ?? null,
      inviterAvatarUrl: inviter?.avatar_url ?? null,
      createdAt: row.created_at,
    });
  }

  return NextResponse.json({ invites });
}
