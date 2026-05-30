import { NextResponse } from "next/server";
import { PRIVATE_BOOK_PLACEHOLDER_COVER } from "@/lib/bookPrivacy";
import { parseStoredState } from "@/lib/storage";
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
  const viewerId = user.id;

  const { data: events } = await supabase
    .from("feed_events")
    .select("id, user_id, event_type, book_id, book_title, book_author, book_cover_url, shelf, sentiment, derived_score, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, user_id, body, book_id, book_title, book_author, book_cover_url, club_id, created_at")
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

  const privateBooksByUser = new Map<string, Set<string>>();
  if (authorIds.size > 0) {
    const { data: libs } = await supabase
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
  const reactionMap = new Map<
    string,
    { likes: number; userLiked: boolean; likeUserIds: string[]; comments: CommentRow[] }
  >();

  if (postIds.length > 0) {
    const { data: reactions } = await supabase
      .from("post_reactions")
      .select("id, post_id, user_id, type, body, parent_id, created_at")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });

    for (const r of reactions ?? []) {
      let entry = reactionMap.get(r.post_id);
      if (!entry) {
        entry = { likes: 0, userLiked: false, likeUserIds: [], comments: [] };
        reactionMap.set(r.post_id, entry);
      }
      if (r.type === "like") {
        entry.likes += 1;
        entry.likeUserIds.push(r.user_id);
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

  const eventIds = (events ?? []).map((e) => e.id);
  const eventReactionMap = new Map<
    string,
    { likes: number; userLiked: boolean; likeUserIds: string[]; comments: CommentRow[] }
  >();

  if (eventIds.length > 0) {
    const { data: eReactions } = await supabase
      .from("event_reactions")
      .select("id, event_id, user_id, type, body, parent_id, created_at")
      .in("event_id", eventIds)
      .order("created_at", { ascending: true });

    for (const r of eReactions ?? []) {
      let entry = eventReactionMap.get(r.event_id);
      if (!entry) {
        entry = { likes: 0, userLiked: false, likeUserIds: [], comments: [] };
        eventReactionMap.set(r.event_id, entry);
      }
      if (r.type === "like") {
        entry.likes += 1;
        entry.likeUserIds.push(r.user_id);
        if (r.user_id === user.id) entry.userLiked = true;
      } else if (r.type === "comment" && r.body) {
        entry.comments.push({ id: r.id, user_id: r.user_id, body: r.body, parent_id: r.parent_id ?? null, created_at: r.created_at, replies: [] });
      }
    }

    for (const entry of eventReactionMap.values()) {
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
  for (const entry of eventReactionMap.values()) {
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

  const likerIds = new Set<string>();
  for (const entry of reactionMap.values()) {
    for (const id of entry.likeUserIds) likerIds.add(id);
  }
  for (const entry of eventReactionMap.values()) {
    for (const id of entry.likeUserIds) likerIds.add(id);
  }
  const missingLikers = Array.from(likerIds).filter((id) => !profileMap.has(id));
  if (missingLikers.length > 0) {
    const { data: likerProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", missingLikers);
    for (const p of likerProfiles ?? []) profileMap.set(p.id, p);
  }

  // Collect all comment reaction IDs to fetch their likes
  const allCommentIds: { id: string; source: "post" | "event" }[] = [];
  for (const entry of reactionMap.values()) {
    for (const c of entry.comments) {
      allCommentIds.push({ id: c.id, source: "post" });
      for (const r of c.replies) allCommentIds.push({ id: r.id, source: "post" });
    }
  }
  for (const entry of eventReactionMap.values()) {
    for (const c of entry.comments) {
      allCommentIds.push({ id: c.id, source: "event" });
      for (const r of c.replies) allCommentIds.push({ id: r.id, source: "event" });
    }
  }

  const commentLikesMap = new Map<string, { count: number; userLiked: boolean }>();
  if (allCommentIds.length > 0) {
    const ids = allCommentIds.map((c) => c.id);
    const { data: cLikes } = await supabase
      .from("comment_likes")
      .select("reaction_id, user_id")
      .in("reaction_id", ids);
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

  function likedByPreviewFor(likeUserIds: string[], totalLikes: number) {
    const unique = Array.from(new Set(likeUserIds));
    const users = unique.slice(0, 2).map((id) => {
      const p = profileMap.get(id);
      return {
        userId: id,
        displayName: p?.display_name?.trim() || "Reader",
        username: p?.username ?? null,
        avatarUrl: p?.avatar_url ?? null,
      };
    });
    return { users, totalLikes };
  }

  const clubIds = new Set<string>();
  for (const p of posts ?? []) {
    if (p.club_id) clubIds.add(p.club_id);
  }
  const clubNameMap = new Map<string, string>();
  if (clubIds.size > 0) {
    const { data: clubs } = await supabase
      .from("clubs")
      .select("id, name")
      .in("id", Array.from(clubIds));
    for (const c of clubs ?? []) clubNameMap.set(c.id, c.name);
  }

  type Item = { kind: string; createdAt: string; [key: string]: unknown };
  const items: Item[] = [];

  for (const e of events ?? []) {
    const er = eventReactionMap.get(e.id);
    const hideBook = shouldHideBook(e.user_id, e.book_id);
    items.push({
      kind: "event",
      id: e.id,
      author: makeAuthor(e.user_id),
      eventType: e.event_type,
      shelf: e.shelf ?? "",
      bookId: e.book_id,
      bookTitle: hideBook ? "Private book" : e.book_title,
      bookAuthor: hideBook ? "Hidden" : e.book_author,
      bookCoverUrl: hideBook ? PRIVATE_BOOK_PLACEHOLDER_COVER : e.book_cover_url,
      sentiment: hideBook ? null : (e.sentiment ?? null),
      derivedScore: hideBook ? null : (e.derived_score ?? null),
      notes: hideBook ? "" : (e.notes ?? ""),
      likes: er?.likes ?? 0,
      userLiked: er?.userLiked ?? false,
      likedByPreview: likedByPreviewFor(er?.likeUserIds ?? [], er?.likes ?? 0),
      comments: serializeComments(er?.comments ?? []),
      createdAt: e.created_at,
    });
  }

  for (const p of posts ?? []) {
    const r = reactionMap.get(p.id);
    const hideBook = shouldHideBook(p.user_id, p.book_id);
    items.push({
      kind: "post",
      id: p.id,
      author: makeAuthor(p.user_id),
      body: p.body,
      bookId: p.book_id ?? null,
      bookTitle: hideBook ? "Private book" : (p.book_title ?? null),
      bookAuthor: hideBook ? "Hidden" : (p.book_author ?? null),
      bookCoverUrl: hideBook ? PRIVATE_BOOK_PLACEHOLDER_COVER : (p.book_cover_url ?? null),
      clubId: p.club_id ?? null,
      clubName: p.club_id ? (clubNameMap.get(p.club_id) ?? null) : null,
      likes: r?.likes ?? 0,
      userLiked: r?.userLiked ?? false,
      likedByPreview: likedByPreviewFor(r?.likeUserIds ?? [], r?.likes ?? 0),
      comments: serializeComments(r?.comments ?? []),
      createdAt: p.created_at,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ items: items.slice(0, 50), currentUserId: viewerId });
}
