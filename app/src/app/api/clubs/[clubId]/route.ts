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

type Ctx = { params: Promise<{ clubId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ club: null });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ club: null });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { clubId } = await ctx.params;
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ club: null });

  const { data: club } = await sb.from("clubs").select("*").eq("id", clubId).single();
  if (!club) return NextResponse.json({ error: "Club not found." }, { status: 404 });

  const { data: members } = await sb
    .from("club_members")
    .select("user_id, role, joined_at")
    .eq("club_id", clubId);

  const memberUserIds = (members ?? []).map((m) => m.user_id);
  const profileMap = new Map<string, { display_name: string; username: string | null; avatar_url: string | null }>();
  if (memberUserIds.length > 0) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", memberUserIds);
    for (const p of profiles ?? []) profileMap.set(p.id, p);
  }

  const myMembership = (members ?? []).find((m) => m.user_id === user.id);

  const result = {
    id: club.id,
    name: club.name,
    description: club.description,
    creatorId: club.creator_id,
    isPublic: club.is_public,
    inviteCode: club.invite_code,
    currentBook: club.current_book_id
      ? { id: club.current_book_id, title: club.current_book_title ?? "", author: club.current_book_author ?? "", coverUrl: club.current_book_cover_url ?? "" }
      : null,
    memberCount: (members ?? []).length,
    role: myMembership?.role ?? null,
    createdAt: club.created_at,
    members: (members ?? []).map((m) => {
      const p = profileMap.get(m.user_id);
      return {
        userId: m.user_id,
        displayName: p?.display_name ?? "Reader",
        username: p?.username ?? null,
        avatarUrl: p?.avatar_url ?? null,
        role: m.role,
      };
    }),
  };

  return NextResponse.json({ club: result });
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { clubId } = await ctx.params;
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: membership } = await sb
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const b = raw as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if (typeof b.name === "string" && b.name.trim()) updates.name = b.name.trim();
  if (typeof b.description === "string") updates.description = b.description.trim();
  if (typeof b.isPublic === "boolean") updates.is_public = b.isPublic;

  if ("currentBook" in b) {
    if (b.currentBook === null) {
      updates.current_book_id = null;
      updates.current_book_title = null;
      updates.current_book_author = null;
      updates.current_book_cover_url = null;
    } else if (typeof b.currentBook === "object" && b.currentBook) {
      const cb = b.currentBook as Record<string, unknown>;
      updates.current_book_id = typeof cb.id === "string" ? cb.id : null;
      updates.current_book_title = typeof cb.title === "string" ? cb.title : null;
      updates.current_book_author = typeof cb.author === "string" ? cb.author : null;
      updates.current_book_cover_url = typeof cb.coverUrl === "string" ? cb.coverUrl : null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await sb.from("clubs").update(updates).eq("id", clubId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { clubId } = await ctx.params;

  const { error } = await supabase.from("clubs").delete().eq("id", clubId).eq("creator_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
