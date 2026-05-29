import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "@/lib/types";
import { applyProfileDbFields, getInitialState, parseStoredState } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

function jsonNoStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

type ProfileRow = { display_name: string | null; tagline: string | null };

async function loadProfileRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, tagline")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

function mergeProfileIntoState(state: AppState, profileRow: ProfileRow | null): AppState {
  if (!profileRow) return state;
  return applyProfileDbFields(state, profileRow.display_name, profileRow.tagline);
}

async function loadLibraryState(
  supabase: SupabaseClient,
  userId: string,
  profileRow: ProfileRow | null,
): Promise<{ state: AppState | null; updatedAt: string | null }> {
  const { data, error } = await supabase
    .from("libraries")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    if (profileRow) {
      return {
        state: applyProfileDbFields(getInitialState(), profileRow.display_name, profileRow.tagline),
        updatedAt: null,
      };
    }
    return { state: null, updatedAt: null };
  }

  const raw = typeof data.state === "string" ? data.state : JSON.stringify(data.state);
  const parsed = parseStoredState(raw);
  if (!parsed) throw new Error("Invalid cloud library payload.");

  return {
    state: mergeProfileIntoState(parsed, profileRow),
    updatedAt: data.updated_at ?? null,
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return jsonNoStore({ error: "Cloud sync is not configured." }, 503);
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return jsonNoStore({ error: "Cloud sync is not configured." }, 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }

  try {
    const profileRow = await loadProfileRow(supabase, user.id);
    const library = await loadLibraryState(supabase, user.id, profileRow);
    return jsonNoStore({ state: library.state, updatedAt: library.updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load library.";
    return jsonNoStore({ error: message }, 500);
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return jsonNoStore({ error: "Cloud sync is not configured." }, 503);
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return jsonNoStore({ error: "Cloud sync is not configured." }, 503);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid JSON body." }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return jsonNoStore({ error: "Invalid body." }, 400);
  }

  const stateRaw =
    "state" in body ? JSON.stringify((body as { state: unknown }).state) : null;
  if (!stateRaw) {
    return jsonNoStore({ error: "Missing state." }, 400);
  }

  const state: AppState | null = parseStoredState(stateRaw);
  if (!state) {
    return jsonNoStore({ error: "Invalid library state." }, 400);
  }

  const lastKnownUpdatedAt =
    "lastKnownUpdatedAt" in body &&
    (body as { lastKnownUpdatedAt?: unknown }).lastKnownUpdatedAt != null
      ? String((body as { lastKnownUpdatedAt: unknown }).lastKnownUpdatedAt)
      : null;

  try {
    const profileRow = await loadProfileRow(supabase, user.id);
    const existing = await loadLibraryState(supabase, user.id, profileRow);

    if (
      existing.updatedAt &&
      lastKnownUpdatedAt !== null &&
      lastKnownUpdatedAt !== existing.updatedAt
    ) {
      return jsonNoStore(
        {
          stale: true,
          error: "Server library is newer than this device last synced.",
          state: existing.state,
          updatedAt: existing.updatedAt,
        },
        409,
      );
    }

    if (existing.updatedAt && lastKnownUpdatedAt === null) {
      return jsonNoStore(
        {
          stale: true,
          error: "Server library exists but device has no sync version.",
          state: existing.state,
          updatedAt: existing.updatedAt,
        },
        409,
      );
    }

    const profile = state.profile;
    await supabase.from("profiles").upsert({
      id: user.id,
      display_name: profile.displayName,
      tagline: profile.tagline,
    });

    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from("libraries").upsert({
      user_id: user.id,
      state,
      updated_at: updatedAt,
    });

    if (error) {
      return jsonNoStore({ error: error.message }, 500);
    }

    return jsonNoStore({ ok: true, updatedAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save library.";
    return jsonNoStore({ error: message }, 500);
  }
}
