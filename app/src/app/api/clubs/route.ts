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
  if (!isSupabaseConfigured()) return NextResponse.json({ clubs: [] });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ clubs: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ clubs: [] });

  const { data: memberships } = await sb
    .from("club_members")
    .select("club_id, role")
    .eq("user_id", user.id);

  const memberClubIds = (memberships ?? []).map((m) => m.club_id);
  const roleMap = new Map<string, string>();
  for (const m of memberships ?? []) roleMap.set(m.club_id, m.role);

  let clubs: unknown[] = [];
  if (memberClubIds.length > 0) {
    const { data } = await sb.from("clubs").select("*").in("id", memberClubIds);
    clubs = data ?? [];
  }

  const { data: countRows } = await sb
    .from("club_members")
    .select("club_id")
    .in("club_id", memberClubIds);

  const countMap = new Map<string, number>();
  for (const r of countRows ?? []) {
    countMap.set(r.club_id, (countMap.get(r.club_id) ?? 0) + 1);
  }

  type ClubRow = {
    id: string; name: string; description: string; creator_id: string;
    is_public: boolean; invite_code: string; icon_url: string | null;
    current_book_id: string | null; current_book_title: string | null;
    current_book_author: string | null; current_book_cover_url: string | null;
    created_at: string;
  };

  const result = (clubs as ClubRow[]).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    creatorId: c.creator_id,
    isPublic: c.is_public,
    inviteCode: c.invite_code,
    iconUrl: c.icon_url ?? null,
    currentBook: c.current_book_id
      ? { id: c.current_book_id, title: c.current_book_title ?? "", author: c.current_book_author ?? "", coverUrl: c.current_book_cover_url ?? "" }
      : null,
    memberCount: countMap.get(c.id) ?? 0,
    role: roleMap.get(c.id) ?? null,
    createdAt: c.created_at,
  }));

  return NextResponse.json({ clubs: result });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const b = raw as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Club name is required." }, { status: 400 });

  const description = typeof b.description === "string" ? b.description.trim() : "";
  const isPublic = b.isPublic === true;

  const currentBook = b.currentBook && typeof b.currentBook === "object" ? b.currentBook as Record<string, unknown> : null;

  const { data: club, error } = await supabase.from("clubs").insert({
    name,
    description,
    creator_id: user.id,
    is_public: isPublic,
    current_book_id: currentBook && typeof currentBook.id === "string" ? currentBook.id : null,
    current_book_title: currentBook && typeof currentBook.title === "string" ? currentBook.title : null,
    current_book_author: currentBook && typeof currentBook.author === "string" ? currentBook.author : null,
    current_book_cover_url: currentBook && typeof currentBook.coverUrl === "string" ? currentBook.coverUrl : null,
  }).select("id").single();

  if (error || !club) return NextResponse.json({ error: error?.message ?? "Failed to create club." }, { status: 500 });

  await supabase.from("club_members").insert({
    club_id: club.id,
    user_id: user.id,
    role: "admin",
  });

  return NextResponse.json({ ok: true, clubId: club.id });
}
