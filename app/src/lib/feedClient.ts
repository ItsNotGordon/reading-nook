export type FeedAuthor = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

export type FeedComment = {
  id: string;
  author: FeedAuthor;
  body: string;
  createdAt: string;
  likeCount: number;
  userLiked: boolean;
  replies: FeedComment[];
};

export type FeedEvent = {
  kind: "event";
  id: string;
  author: FeedAuthor;
  eventType: string;
  shelf: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string;
  sentiment: string | null;
  derivedScore: number | null;
  notes: string;
  likes: number;
  userLiked: boolean;
  comments: FeedComment[];
  createdAt: string;
};

export type FeedPost = {
  kind: "post";
  id: string;
  author: FeedAuthor;
  body: string;
  bookId: string | null;
  bookTitle: string | null;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
  likes: number;
  userLiked: boolean;
  comments: FeedComment[];
  createdAt: string;
};

export type FeedItem = FeedEvent | FeedPost;

export type FeedResponse = {
  items: FeedItem[];
  currentUserId: string | null;
};

export async function fetchFeed(): Promise<FeedResponse> {
  const res = await fetch("/api/feed", { cache: "no-store" });
  if (!res.ok) return { items: [], currentUserId: null };
  const data: unknown = await res.json();
  if (!data || typeof data !== "object") return { items: [], currentUserId: null };
  const d = data as { items?: unknown; currentUserId?: unknown };
  const items = Array.isArray(d.items) ? (d.items as FeedItem[]) : [];
  const currentUserId = typeof d.currentUserId === "string" ? d.currentUserId : null;
  return { items, currentUserId };
}

export type PostFeedEventInput = {
  eventType: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string;
  shelf: string;
  sentiment?: string | null;
  derivedScore?: number | null;
  notes?: string;
};

export function postFeedEvent(input: PostFeedEventInput): void {
  void fetch("/api/feed/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {});
}

const DEBOUNCE_MS = 30_000;
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingEvent: PostFeedEventInput | null = null;

export function debouncedPostFeedEvent(input: PostFeedEventInput): void {
  _pendingEvent = input;
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    if (_pendingEvent) postFeedEvent(_pendingEvent);
    _pendingEvent = null;
    _debounceTimer = null;
  }, DEBOUNCE_MS);
}

export type CreatePostInput = {
  body: string;
  bookId?: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookCoverUrl?: string;
};

export async function createPost(input: CreatePostInput): Promise<boolean> {
  const res = await fetch("/api/feed/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.ok;
}

export async function toggleLike(postId: string): Promise<boolean> {
  const res = await fetch(`/api/feed/posts/${postId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "like" }),
  });
  return res.ok;
}

export async function addComment(postId: string, body: string, parentId?: string): Promise<boolean> {
  const res = await fetch(`/api/feed/posts/${postId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "comment", body, ...(parentId ? { parentId } : {}) }),
  });
  return res.ok;
}

export async function deleteComment(postId: string, reactionId: string): Promise<boolean> {
  const res = await fetch(`/api/feed/posts/${postId}/react`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reactionId }),
  });
  return res.ok;
}

export async function toggleEventLike(eventId: string): Promise<boolean> {
  const res = await fetch(`/api/feed/events/${eventId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "like" }),
  });
  return res.ok;
}

export async function addEventComment(eventId: string, body: string, parentId?: string): Promise<boolean> {
  const res = await fetch(`/api/feed/events/${eventId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "comment", body, ...(parentId ? { parentId } : {}) }),
  });
  return res.ok;
}

export async function deleteEventComment(eventId: string, reactionId: string): Promise<boolean> {
  const res = await fetch(`/api/feed/events/${eventId}/react`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reactionId }),
  });
  return res.ok;
}

export async function toggleCommentLike(reactionId: string, source: "post" | "event"): Promise<boolean> {
  const res = await fetch(`/api/feed/comments/${reactionId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  });
  return res.ok;
}

export async function editPost(postId: string, body: string): Promise<boolean> {
  const res = await fetch(`/api/feed/posts/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return res.ok;
}

export async function deletePost(postId: string): Promise<boolean> {
  const res = await fetch(`/api/feed/posts/${postId}`, { method: "DELETE" });
  return res.ok;
}
