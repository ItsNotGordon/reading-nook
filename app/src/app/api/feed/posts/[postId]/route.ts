import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { postId } = await params;

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const b = raw as Record<string, unknown>;
  const body = typeof b.body === "string" ? b.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "Post body is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("posts")
    .update({ body })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { postId } = await params;

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
