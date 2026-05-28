import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clubIconStoragePath, clubIconPublicUrl, isOwnClubIconUrl } from "@/lib/clubIcon";
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

type Ctx = { params: Promise<{ clubId: string }> };

async function requireClubMember(clubId: string, userId: string) {
  const sb = getServiceClient();
  if (!sb) return { error: NextResponse.json({ error: "Not configured." }, { status: 503 }) };

  const { data: membership } = await sb
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return { error: NextResponse.json({ error: "Not a club member." }, { status: 403 }) };
  }
  return { sb, membership };
}

async function requireClubAdmin(clubId: string, userId: string) {
  const result = await requireClubMember(clubId, userId);
  if ("error" in result && result.error) return result;
  if (!result.membership || result.membership.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin only." }, { status: 403 }) };
  }
  return result;
}

export async function GET(_req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud clubs require Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud clubs require Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { clubId } = await ctx.params;
  const memberCheck = await requireClubMember(clubId, user.id);
  if (memberCheck.error) return memberCheck.error;

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ iconUrl: null });

  const { data: club, error } = await sb
    .from("clubs")
    .select("icon_url")
    .eq("id", clubId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ iconUrl: club?.icon_url ?? null });
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud clubs require Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud clubs require Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { clubId } = await ctx.params;
  const adminCheck = await requireClubAdmin(clubId, user.id);
  if (adminCheck.error) return adminCheck.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const iconUrl =
    typeof body === "object" && body !== null && "iconUrl" in body
      ? (body as { iconUrl: unknown }).iconUrl
      : undefined;

  if (iconUrl !== null && typeof iconUrl !== "string") {
    return NextResponse.json({ error: "iconUrl must be a string or null." }, { status: 400 });
  }

  if (iconUrl !== null && !isOwnClubIconUrl(clubId, iconUrl)) {
    return NextResponse.json({ error: "Invalid icon URL." }, { status: 400 });
  }

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { error } = await sb.from("clubs").update({ icon_url: iconUrl }).eq("id", clubId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, iconUrl });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud clubs require Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud clubs require Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { clubId } = await ctx.params;
  const adminCheck = await requireClubAdmin(clubId, user.id);
  if (adminCheck.error) return adminCheck.error;

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  await sb.storage.from("club-icons").remove([clubIconStoragePath(clubId)]);

  const { error } = await sb.from("clubs").update({ icon_url: null }).eq("id", clubId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, iconUrl: null });
}
