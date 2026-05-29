import { NextResponse } from "next/server";
import { insertFollow, deleteFollow } from "@/lib/socialGraph";
import { normalizeUsername } from "@/lib/username";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function resolveTarget(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  username: string,
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_public")
    .eq("username", username)
    .maybeSingle();
  return profile;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ username: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase required." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase required." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { username: raw } = await context.params;
  const username = normalizeUsername(raw);
  if (!username) {
    return NextResponse.json({ error: "Username required." }, { status: 400 });
  }

  const profile = await resolveTarget(supabase, username);
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (profile.id === user.id) {
    return NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 });
  }

  if (!profile.is_public) {
    return NextResponse.json(
      {
        error:
          "This account is private. Send a friend request instead — they must approve before you can follow.",
      },
      { status: 403 },
    );
  }

  const result = await insertFollow(user.id, profile.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ username: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase required." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase required." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { username: raw } = await context.params;
  const username = normalizeUsername(raw);
  if (!username) {
    return NextResponse.json({ error: "Username required." }, { status: 400 });
  }

  const profile = await resolveTarget(supabase, username);
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await deleteFollow(user.id, profile.id);
  return NextResponse.json({ ok: true });
}
