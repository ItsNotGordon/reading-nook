import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/config";

type Ctx = { params: Promise<{ clubId: string }> };

function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

export async function POST(request: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { clubId } = await ctx.params;
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: club } = await sb.from("clubs").select("id, is_public, invite_code").eq("id", clubId).single();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  if (!club.is_public) {
    const raw: unknown = await request.json().catch(() => null);
    const b = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const code = typeof b.inviteCode === "string" ? b.inviteCode.trim() : "";
    if (code !== club.invite_code) {
      return NextResponse.json({ error: "Invalid invite code." }, { status: 403 });
    }
  }

  const { data: existing } = await sb
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ ok: true });

  const { error } = await sb.from("club_members").insert({
    club_id: clubId,
    user_id: user.id,
    role: "member",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
