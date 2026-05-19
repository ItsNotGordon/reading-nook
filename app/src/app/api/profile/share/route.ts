import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Cloud is not configured." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Cloud is not configured." }, { status: 503 });
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

  const shareShelves =
    typeof body === "object" &&
    body !== null &&
    "shareShelves" in body &&
    typeof (body as { shareShelves: unknown }).shareShelves === "boolean"
      ? (body as { shareShelves: boolean }).shareShelves
      : null;

  if (shareShelves === null) {
    return NextResponse.json({ error: "Missing shareShelves boolean." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ share_shelves: shareShelves, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shareShelves });
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ shareShelves: false, configured: false });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ shareShelves: false, configured: false });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ shareShelves: false, configured: true, signedIn: false });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("share_shelves")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    shareShelves: Boolean(data?.share_shelves),
    configured: true,
    signedIn: true,
  });
}
