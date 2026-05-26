import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reactionId: string }> },
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

  const { reactionId } = await params;
  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const b = raw as Record<string, unknown>;
  const source = typeof b.source === "string" ? b.source : "";
  if (source !== "post" && source !== "event") {
    return NextResponse.json({ error: "source must be 'post' or 'event'." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("reaction_id", reactionId)
    .eq("reaction_source", source)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("comment_likes").delete().eq("id", existing.id);
    return NextResponse.json({ ok: true, liked: false });
  }

  const { error } = await supabase.from("comment_likes").insert({
    reaction_id: reactionId,
    reaction_source: source,
    user_id: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, liked: true });
}
