"use client";

import { useState } from "react";
import Image from "next/image";
import type { FeedItem, FeedComment as FeedCommentType } from "@/lib/feedClient";
import { toggleLike, addComment } from "@/lib/feedClient";

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

function sentimentEmoji(sentiment: string | null): string {
  switch (sentiment) {
    case "liked": return "\u2764\uFE0F";
    case "okay": return "\uD83D\uDE10";
    case "disliked": return "\uD83D\uDC4E";
    default: return "";
  }
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
              <Avatar name={c.author.displayName} url={c.author.avatarUrl} />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground">
                  {c.author.displayName}
                </span>
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
  onRefresh: () => void;
};

export function FeedCard({ item, onRefresh }: FeedCardProps) {
  const [liked, setLiked] = useState(item.kind === "post" ? item.userLiked : false);
  const [likeCount, setLikeCount] = useState(item.kind === "post" ? item.likes : 0);

  async function handleToggleLike() {
    if (item.kind !== "post") return;
    const ok = await toggleLike(item.id);
    if (ok) {
      setLiked((prev) => !prev);
      setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
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

    return (
      <div className="rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
        <div className="flex items-start gap-2.5">
          <Avatar name={item.author.displayName} url={item.author.avatarUrl} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{item.author.displayName}</span>{" "}
              {verb}{" "}
              <span className="font-semibold">&ldquo;{item.bookTitle}&rdquo;</span>
              {item.sentiment ? ` ${sentimentEmoji(item.sentiment)}` : ""}
            </p>
            <p className="mt-0.5 text-[10px] text-foreground-muted">
              {item.bookAuthor} &middot; {timeAgo(item.createdAt)}
            </p>
            {item.notes ? (
              <p className="mt-1.5 text-xs italic text-foreground-muted">
                &ldquo;{item.notes}&rdquo;
              </p>
            ) : null}
          </div>
          <BookThumbnail coverUrl={item.bookCoverUrl} title={item.bookTitle} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <div className="flex items-start gap-2.5">
        <Avatar name={item.author.displayName} url={item.author.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {item.author.displayName}
            </span>
            <span className="text-[10px] text-foreground-muted">
              {timeAgo(item.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground">{item.body}</p>

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
