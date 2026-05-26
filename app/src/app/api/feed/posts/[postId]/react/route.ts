import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(
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
  const type = typeof b.type === "string" ? b.type : "";

  if (type === "like") {
    const { data: existing } = await supabase
      .from("post_reactions")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .eq("type", "like")
      .maybeSingle();

    if (existing) {
      await supabase.from("post_reactions").delete().eq("id", existing.id);
      return NextResponse.json({ ok: true, liked: false });
    }

    const { error } = await supabase.from("post_reactions").insert({
      post_id: postId,
      user_id: user.id,
      type: "like",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, liked: true });
  }

  if (type === "comment") {
    const commentBody = typeof b.body === "string" ? b.body.trim() : "";
    if (!commentBody) {
      return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
    }

    const { error } = await supabase.from("post_reactions").insert({
      post_id: postId,
      user_id: user.id,
      type: "comment",
      body: commentBody,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid type." }, { status: 400 });
}
