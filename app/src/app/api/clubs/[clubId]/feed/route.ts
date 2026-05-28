import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PRIVATE_BOOK_PLACEHOLDER_COVER } from "@/lib/bookPrivacy";
import { parseStoredState } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

type Ctx = { params: Promise<{ clubId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!isSupabaseConfigured()) return NextResponse.json({ items: [] });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ items: [] });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const viewerId = user.id;

  const { clubId } = await ctx.params;
  const sb = getServiceClient();
  if (!sb) return NextResponse.json({ items: [] });

  const { data: membership } = await sb
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", viewerId)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Not a member." }, { status: 403 });

  const { data: posts } = await sb
    .from("posts")
    .select("id, user_id, body, book_id, book_title, book_author, book_cover_url, club_id, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(50);

  const authorIds = new Set<string>();
  for (const p of posts ?? []) authorIds.add(p.user_id);

  const profileMap = new Map<string, { display_name: string; username: string | null; avatar_url: string | null }>();
  if (authorIds.size > 0) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", Array.from(authorIds));
    for (const p of profiles ?? []) profileMap.set(p.id, p);
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

  const privateBooksByUser = new Map<string, Set<string>>();
  if (authorIds.size > 0) {
    const { data: libs } = await sb
      .from("libraries")
      .select("user_id, state")
      .in("user_id", Array.from(authorIds));
    for (const lib of libs ?? []) {
      const raw = typeof lib.state === "string" ? lib.state : JSON.stringify(lib.state);
      const parsed = parseStoredState(raw);
      if (!parsed) continue;
      const privateIds = new Set<string>();
      for (const [bookId, ub] of Object.entries(parsed.userBooks)) {
        if (ub?.visibility === "private") privateIds.add(bookId);
      }
      privateBooksByUser.set(lib.user_id, privateIds);
    }
  }

  function shouldHideBook(userId: string, bookId: string | null | undefined): boolean {
    if (!bookId) return false;
    if (userId === viewerId) return false;
    return privateBooksByUser.get(userId)?.has(bookId) ?? false;
  }

  const postIds = (posts ?? []).map((p) => p.id);
  type CommentRow = { id: string; user_id: string; body: string; parent_id: string | null; created_at: string; replies: CommentRow[] };
  const reactionMap = new Map<string, { likes: number; userLiked: boolean; comments: CommentRow[] }>();

  if (postIds.length > 0) {
    const { data: reactions } = await sb
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
      const { data: extra } = await sb
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", missing);
      for (const p of extra ?? []) profileMap.set(p.id, p);
    }
  }

  const allCommentIds: string[] = [];
  for (const entry of reactionMap.values()) {
    for (const c of entry.comments) {
      allCommentIds.push(c.id);
      for (const r of c.replies) allCommentIds.push(r.id);
    }
  }

  const commentLikesMap = new Map<string, { count: number; userLiked: boolean }>();
  if (allCommentIds.length > 0) {
    const { data: cLikes } = await sb
      .from("comment_likes")
      .select("reaction_id, user_id")
      .in("reaction_id", allCommentIds);
    for (const cl of cLikes ?? []) {
      let entry = commentLikesMap.get(cl.reaction_id);
      if (!entry) {
        entry = { count: 0, userLiked: false };
        commentLikesMap.set(cl.reaction_id, entry);
      }
      entry.count += 1;
      if (cl.user_id === user.id) entry.userLiked = true;
    }
  }

  function serializeComments(comments: CommentRow[]) {
    return comments.map((c) => {
      const cl = commentLikesMap.get(c.id);
      return {
        id: c.id,
        author: makeAuthor(c.user_id),
        body: c.body,
        createdAt: c.created_at,
        likeCount: cl?.count ?? 0,
        userLiked: cl?.userLiked ?? false,
        replies: c.replies.map((reply) => {
          const rl = commentLikesMap.get(reply.id);
          return {
            id: reply.id,
            author: makeAuthor(reply.user_id),
            body: reply.body,
            createdAt: reply.created_at,
            likeCount: rl?.count ?? 0,
            userLiked: rl?.userLiked ?? false,
            replies: [],
          };
        }),
      };
    });
  }

  const { data: clubRow } = await sb.from("clubs").select("name").eq("id", clubId).single();

  const items = (posts ?? []).map((p) => {
    const r = reactionMap.get(p.id);
    const hideBook = shouldHideBook(p.user_id, p.book_id);
    return {
      kind: "post" as const,
      id: p.id,
      author: makeAuthor(p.user_id),
      body: p.body,
      bookId: p.book_id ?? null,
      bookTitle: hideBook ? "Private book" : (p.book_title ?? null),
      bookAuthor: hideBook ? "Hidden" : (p.book_author ?? null),
      bookCoverUrl: hideBook ? PRIVATE_BOOK_PLACEHOLDER_COVER : (p.book_cover_url ?? null),
      clubId: p.club_id ?? null,
      clubName: clubRow?.name ?? null,
      likes: r?.likes ?? 0,
      userLiked: r?.userLiked ?? false,
      comments: serializeComments(r?.comments ?? []),
      createdAt: p.created_at,
    };
  });

  return NextResponse.json({ items, currentUserId: viewerId });
}
