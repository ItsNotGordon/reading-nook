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

  const raw: unknown = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const b = raw as Record<string, unknown>;
  const body = typeof b.body === "string" ? b.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "Post body is required." }, { status: 400 });
  }

  const bookId = typeof b.bookId === "string" && b.bookId ? b.bookId : null;
  const bookTitle = typeof b.bookTitle === "string" && b.bookTitle ? b.bookTitle : null;
  const bookAuthor = typeof b.bookAuthor === "string" && b.bookAuthor ? b.bookAuthor : null;
  const bookCoverUrl = typeof b.bookCoverUrl === "string" && b.bookCoverUrl ? b.bookCoverUrl : null;

  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    body,
    book_id: bookId,
    book_title: bookTitle,
    book_author: bookAuthor,
    book_cover_url: bookCoverUrl,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
