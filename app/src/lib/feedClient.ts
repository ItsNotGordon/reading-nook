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

export async function fetchFeed(): Promise<FeedItem[]> {
  const res = await fetch("/api/feed", { cache: "no-store" });
  if (!res.ok) return [];
  const data: unknown = await res.json();
  if (!data || typeof data !== "object") return [];
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items as FeedItem[];
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

export async function addComment(postId: string, body: string): Promise<boolean> {
  const res = await fetch(`/api/feed/posts/${postId}/react`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "comment", body }),
  });
  return res.ok;
}

export async function deletePost(postId: string): Promise<boolean> {
  const res = await fetch(`/api/feed/posts/${postId}`, { method: "DELETE" });
  return res.ok;
}
