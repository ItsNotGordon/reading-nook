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

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ club: null });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ club: null });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { code } = await ctx.params;
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ club: null });

  const { data: club } = await sb
    .from("clubs")
    .select("id, name")
    .eq("invite_code", code)
    .single();

  if (!club) return NextResponse.json({ error: "Invalid invite code." }, { status: 404 });

  const { count } = await sb
    .from("club_members")
    .select("id", { count: "exact", head: true })
    .eq("club_id", club.id);

  return NextResponse.json({
    club: { clubId: club.id, name: club.name, memberCount: count ?? 0 },
  });
}
