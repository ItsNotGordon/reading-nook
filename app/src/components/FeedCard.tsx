"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FeedItem, FeedComment as FeedCommentType, FeedAuthor } from "@/lib/feedClient";
import { toggleLike, addComment, deletePost, editPost } from "@/lib/feedClient";
import { ProgressBar } from "./ProgressBar";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function shelfLabel(shelf: string): string {
  switch (shelf) {
    case "want_to_read": return "Want to Read";
    case "reading": return "Currently Reading";
    case "finished": return "Finished";
    default: return shelf;
  }
}

function sentimentLabel(sentiment: string | null): string {
  switch (sentiment) {
    case "liked": return "\u2764\uFE0F Liked";
    case "okay": return "\uD83D\uDE10 Okay";
    case "disliked": return "\uD83D\uDC4E Disliked";
    default: return "";
  }
}

function authorLabel(author: FeedAuthor): string {
  return author.username ? `@${author.username}` : author.displayName;
}

function AuthorLink({ author, children }: { author: FeedAuthor; children: React.ReactNode }) {
  if (author.username) {
    return (
      <Link href={`/friends/${encodeURIComponent(author.username)}`} className="inline-flex items-center gap-1.5">
        {children}
      </Link>
    );
  }
  return <span className="inline-flex items-center gap-1.5">{children}</span>;
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        unoptimized
      />
    );
  }
  const initial = name.charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft/40 text-xs font-semibold text-accent">
      {initial}
    </div>
  );
}

function BookThumbnail({ coverUrl, title }: { coverUrl: string; title: string }) {
  if (!coverUrl) return null;
  return (
    <Image
      src={coverUrl}
      alt={title}
      width={40}
      height={60}
      className="h-[60px] w-[40px] shrink-0 rounded-lg object-cover shadow-sm"
      unoptimized
    />
  );
}

function CommentSection({
  postId,
  comments,
  onCommentAdded,
}: {
  postId: string;
  comments: FeedCommentType[];
  onCommentAdded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const ok = await addComment(postId, t);
    setSending(false);
    if (ok) {
      setText("");
      onCommentAdded();
    }
  }

  if (!expanded && comments.length === 0) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs font-medium text-foreground-muted"
      >
        Comment
      </button>
    );
  }

  return (
    <div className="mt-2 border-t border-border pt-2">
      {comments.length > 0 && !expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs font-medium text-accent"
        >
          View {comments.length} comment{comments.length !== 1 ? "s" : ""}
        </button>
      ) : null}

      {expanded || comments.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <AuthorLink author={c.author}>
                <Avatar name={c.author.displayName} url={c.author.avatarUrl} />
              </AuthorLink>
              <div className="min-w-0 flex-1">
                <AuthorLink author={c.author}>
                  <span className="text-xs font-semibold text-foreground">
                    {authorLabel(c.author)}
                  </span>
                </AuthorLink>
                <span className="ml-1.5 text-xs text-foreground-muted">
                  {c.body}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="text"
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="text-xs font-semibold text-accent disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

type FeedCardProps = {
  item: FeedItem;
  currentUserId: string | null;
  onRefresh: () => void;
};

export function FeedCard({ item, currentUserId, onRefresh }: FeedCardProps) {
  const [liked, setLiked] = useState(item.kind === "post" ? item.userLiked : false);
  const [likeCount, setLikeCount] = useState(item.kind === "post" ? item.likes : 0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.kind === "post" ? item.body : "");
  const [saving, setSaving] = useState(false);

  const isOwn = item.author.userId === currentUserId;

  async function handleToggleLike() {
    if (item.kind !== "post") return;
    const ok = await toggleLike(item.id);
    if (ok) {
      setLiked((prev) => !prev);
      setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this post?")) return;
    const ok = await deletePost(item.id);
    if (ok) onRefresh();
  }

  async function handleSaveEdit() {
    const t = editText.trim();
    if (!t || saving) return;
    setSaving(true);
    const ok = await editPost(item.id, t);
    setSaving(false);
    if (ok) {
      setEditing(false);
      onRefresh();
    }
  }

  if (item.kind === "event") {
    const verb =
      item.eventType === "progress"
        ? "is reading"
        : item.eventType === "finished"
          ? "finished"
          : item.shelf === "reading"
            ? "started reading"
            : item.shelf === "want_to_read"
              ? "wants to read"
              : `added to ${shelfLabel(item.shelf)}`;

    let progressFraction =
      item.eventType === "progress" && typeof item.derivedScore === "number"
        ? item.derivedScore
        : null;
    if (progressFraction === null && item.eventType === "progress" && item.notes) {
      const m = item.notes.match(/\((\d+)%\)/);
      if (m) progressFraction = parseInt(m[1], 10) / 100;
    }

    return (
      <div className="rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
        <div className="flex items-start gap-2.5">
          <AuthorLink author={item.author}>
            <Avatar name={item.author.displayName} url={item.author.avatarUrl} />
          </AuthorLink>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-foreground">
                <AuthorLink author={item.author}>
                  <span className="font-semibold">{authorLabel(item.author)}</span>
                </AuthorLink>{" "}
                {verb}{" "}
                <span className="font-semibold">&ldquo;{item.bookTitle}&rdquo;</span>
              </p>
            </div>
            <p className="mt-0.5 text-[10px] text-foreground-muted">
              {timeAgo(item.createdAt)}
            </p>

            <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent-soft/10 px-2.5 py-1.5">
              <BookThumbnail coverUrl={item.bookCoverUrl} title={item.bookTitle} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {item.bookTitle}
                </p>
                <p className="truncate text-[10px] text-foreground-muted">
                  {item.bookAuthor}
                </p>
                {progressFraction !== null ? (
                  <div className="mt-1 flex items-center gap-2">
                    <ProgressBar
                      mode="exact"
                      value={progressFraction}
                      trackClassName="relative h-1.5 w-full overflow-hidden rounded-full border border-border bg-progress-unread"
                    />
                    <span className="shrink-0 text-[10px] font-medium text-foreground-muted">
                      {Math.round(progressFraction * 100)}%
                    </span>
                  </div>
                ) : null}
                {item.sentiment ? (
                  <p className="mt-1 text-xs font-medium text-foreground-muted">
                    {sentimentLabel(item.sentiment)}
                  </p>
                ) : null}
              </div>
            </div>

            {item.notes && !progressFraction ? (
              <p className="mt-1.5 text-xs italic text-foreground-muted">
                &ldquo;{item.notes}&rdquo;
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <div className="flex items-start gap-2.5">
        <AuthorLink author={item.author}>
          <Avatar name={item.author.displayName} url={item.author.avatarUrl} />
        </AuthorLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AuthorLink author={item.author}>
                <span className="text-sm font-semibold text-foreground">
                  {authorLabel(item.author)}
                </span>
              </AuthorLink>
              <span className="text-[10px] text-foreground-muted">
                {timeAgo(item.createdAt)}
              </span>
            </div>
            {isOwn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(true);
                    setEditText(item.body);
                  }}
                  className="text-[10px] font-medium text-foreground-muted"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="text-[10px] font-medium text-red-400"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          {editing ? (
            <div className="mt-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={!editText.trim() || saving}
                  className="text-xs font-semibold text-accent disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs font-medium text-foreground-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-sm text-foreground">{item.body}</p>
          )}

          {item.bookTitle ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent-soft/10 px-2.5 py-1.5">
              {item.bookCoverUrl ? (
                <BookThumbnail coverUrl={item.bookCoverUrl} title={item.bookTitle} />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {item.bookTitle}
                </p>
                {item.bookAuthor ? (
                  <p className="truncate text-[10px] text-foreground-muted">
                    {item.bookAuthor}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1 text-xs font-medium ${
                liked ? "text-red-500" : "text-foreground-muted"
              }`}
            >
              {liked ? "\u2764\uFE0F" : "\u2661"} {likeCount > 0 ? likeCount : "Like"}
            </button>
            <CommentSection
              postId={item.id}
              comments={item.comments}
              onCommentAdded={onRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
