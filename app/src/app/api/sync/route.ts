import { NextResponse } from "next/server";
import type { AppState } from "@/lib/types";
import { parseStoredState } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud sync is not configured." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud sync is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("libraries")
    .select("state, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ state: null, updatedAt: null });
  }

  const raw = typeof data.state === "string" ? data.state : JSON.stringify(data.state);
  const state = parseStoredState(raw);
  if (!state) {
    return NextResponse.json({ error: "Invalid cloud library payload." }, { status: 500 });
  }

  return NextResponse.json({ state, updatedAt: data.updated_at });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud sync is not configured." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud sync is not configured." }, { status: 503 });
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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const stateRaw =
    typeof body === "object" && body !== null && "state" in body
      ? JSON.stringify((body as { state: unknown }).state)
      : null;
  if (!stateRaw) {
    return NextResponse.json({ error: "Missing state." }, { status: 400 });
  }

  const state: AppState | null = parseStoredState(stateRaw);
  if (!state) {
    return NextResponse.json({ error: "Invalid library state." }, { status: 400 });
  }

  const profile = state.profile;
  await supabase.from("profiles").upsert({
    id: user.id,
    display_name: profile.displayName,
    tagline: profile.tagline,
  });

  const { error } = await supabase.from("libraries").upsert({
    user_id: user.id,
    state,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
