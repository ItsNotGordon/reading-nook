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

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { clubId } = await ctx.params;
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });

  const { error } = await sb
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
