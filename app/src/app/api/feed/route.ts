import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [] });
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ items: [] });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: events } = await supabase
    .from("feed_events")
    .select("id, user_id, event_type, book_id, book_title, book_author, book_cover_url, shelf, sentiment, derived_score, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, user_id, body, book_id, book_title, book_author, book_cover_url, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const authorIds = new Set<string>();
  for (const e of events ?? []) authorIds.add(e.user_id);
  for (const p of posts ?? []) authorIds.add(p.user_id);

  const profileMap = new Map<string, { display_name: string; username: string | null; avatar_url: string | null }>();
  if (authorIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", Array.from(authorIds));
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p);
    }
  }

  function makeAuthor(userId: string) {
    const p = profileMap.get(userId);
    return {
      userId,
      displayName: p?.display_name ?? "Reader",
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
    };
  }

  const postIds = (posts ?? []).map((p) => p.id);
  type CommentRow = { id: string; user_id: string; body: string; parent_id: string | null; created_at: string; replies: CommentRow[] };
  const reactionMap = new Map<string, { likes: number; userLiked: boolean; comments: CommentRow[] }>();

  if (postIds.length > 0) {
    const { data: reactions } = await supabase
      .from("post_reactions")
      .select("id, post_id, user_id, type, body, parent_id, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });

    for (const r of reactions ?? []) {
      let entry = reactionMap.get(r.post_id);
      if (!entry) {
        entry = { likes: 0, userLiked: false, comments: [] };
        reactionMap.set(r.post_id, entry);
      }
      if (r.type === "like") {
        entry.likes += 1;
        if (r.user_id === user.id) entry.userLiked = true;
      } else if (r.type === "comment" && r.body) {
        entry.comments.push({ id: r.id, user_id: r.user_id, body: r.body, parent_id: r.parent_id ?? null, created_at: r.created_at, replies: [] });
      }
    }

    for (const entry of reactionMap.values()) {
      const topLevel: CommentRow[] = [];
      const byId = new Map<string, CommentRow>();
      for (const c of entry.comments) byId.set(c.id, c);
      for (const c of entry.comments) {
        if (c.parent_id && byId.has(c.parent_id)) {
          byId.get(c.parent_id)!.replies.push(c);
        } else {
          topLevel.push(c);
        }
      }
      entry.comments = topLevel;
    }
  }

  const commentAuthorIds = new Set<string>();
  for (const entry of reactionMap.values()) {
    for (const c of entry.comments) {
      commentAuthorIds.add(c.user_id);
      for (const r of c.replies) commentAuthorIds.add(r.user_id);
    }
  }
  if (commentAuthorIds.size > 0) {
    const missing = Array.from(commentAuthorIds).filter((id) => !profileMap.has(id));
    if (missing.length > 0) {
      const { data: extra } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", missing);
      for (const p of extra ?? []) profileMap.set(p.id, p);
    }
  }

  type Item = { kind: string; createdAt: string; [key: string]: unknown };
  const items: Item[] = [];

  for (const e of events ?? []) {
    items.push({
      kind: "event",
      id: e.id,
      author: makeAuthor(e.user_id),
      eventType: e.event_type,
      shelf: e.shelf ?? "",
      bookId: e.book_id,
      bookTitle: e.book_title,
      bookAuthor: e.book_author,
      bookCoverUrl: e.book_cover_url,
      sentiment: e.sentiment ?? null,
      derivedScore: e.derived_score ?? null,
      notes: e.notes ?? "",
      createdAt: e.created_at,
    });
  }

  for (const p of posts ?? []) {
    const r = reactionMap.get(p.id);
    items.push({
      kind: "post",
      id: p.id,
      author: makeAuthor(p.user_id),
      body: p.body,
      bookId: p.book_id ?? null,
      bookTitle: p.book_title ?? null,
      bookAuthor: p.book_author ?? null,
      bookCoverUrl: p.book_cover_url ?? null,
      likes: r?.likes ?? 0,
      userLiked: r?.userLiked ?? false,
      comments: (r?.comments ?? []).map((c) => ({
        id: c.id,
        author: makeAuthor(c.user_id),
        body: c.body,
        createdAt: c.created_at,
        replies: c.replies.map((reply) => ({
          id: reply.id,
          author: makeAuthor(reply.user_id),
          body: reply.body,
          createdAt: reply.created_at,
          replies: [],
        })),
      })),
      createdAt: p.created_at,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ items: items.slice(0, 50), currentUserId: user.id });
}
