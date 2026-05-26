import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
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

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const eventType = typeof b.eventType === "string" ? b.eventType : "";
  const bookId = typeof b.bookId === "string" ? b.bookId : "";
  const bookTitle = typeof b.bookTitle === "string" ? b.bookTitle : "";
  const bookAuthor = typeof b.bookAuthor === "string" ? b.bookAuthor : "";
  const bookCoverUrl = typeof b.bookCoverUrl === "string" ? b.bookCoverUrl : "";
  const shelf = typeof b.shelf === "string" ? b.shelf : null;
  const sentiment = typeof b.sentiment === "string" ? b.sentiment : null;
  const derivedScore = typeof b.derivedScore === "number" ? b.derivedScore : null;
  const notes = typeof b.notes === "string" ? b.notes : "";

  if (!eventType || !bookId || !bookTitle) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const { error } = await supabase.from("feed_events").insert({
    user_id: user.id,
    event_type: eventType,
    book_id: bookId,
    book_title: bookTitle,
    book_author: bookAuthor,
    book_cover_url: bookCoverUrl,
    shelf,
    sentiment,
    derived_score: derivedScore,
    notes,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
