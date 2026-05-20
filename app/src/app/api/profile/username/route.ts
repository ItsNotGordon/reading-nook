import { NextResponse } from "next/server";
import { validateUsername } from "@/lib/username";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud profile requires Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud profile requires Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const checkRaw = searchParams.get("check");
  if (checkRaw !== null) {
    const parsed = validateUsername(checkRaw);
    if (!parsed.ok) {
      return NextResponse.json({ available: false, error: parsed.error });
    }
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", parsed.username)
      .maybeSingle();
    const taken = Boolean(existing && existing.id !== user.id);
    return NextResponse.json({
      available: !taken,
      username: parsed.username,
      error: taken ? "That username is taken." : null,
    });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const username = profile?.username ?? null;
  return NextResponse.json({
    username,
    hasUsername: Boolean(username),
  });
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud profile requires Supabase." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud profile requires Supabase." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body !== null && "username" in body
      ? String((body as { username: unknown }).username)
      : "";
  const parsed = validateUsername(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.username)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.username, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, username: parsed.username });
}
