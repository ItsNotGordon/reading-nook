import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ clubId: string }> };

function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

export async function POST(_request: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { clubId } = await ctx.params;
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: membership } = await sb
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Not a club member." }, { status: 403 });
  }

  const now = new Date().toISOString();

  const { error: memberError } = await sb
    .from("club_members")
    .update({ last_feed_seen_at: now })
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: notifError } = await sb
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", user.id)
    .in("type", ["club_invite", "club_added"])
    .eq("club_id", clubId)
    .is("read_at", null);

  if (notifError) {
    return NextResponse.json({ error: notifError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
