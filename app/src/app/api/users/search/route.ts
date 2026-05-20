import { NextResponse } from "next/server";
import { normalizeUsername } from "@/lib/username";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "User search requires Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "User search requires Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = normalizeUsername(searchParams.get("q") ?? "");
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, tagline, avatar_url")
    .not("username", "is", null)
    .neq("id", user.id)
    .ilike("username", `${q}%`)
    .order("username", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (rows ?? []).map((row) => ({
    id: row.id,
    username: row.username as string,
    displayName: row.display_name ?? "Reader",
    avatarUrl: row.avatar_url ?? null,
    tagline: row.tagline ?? "",
  }));

  return NextResponse.json({ users });
}
