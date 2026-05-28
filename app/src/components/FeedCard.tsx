"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FeedItem, FeedComment as FeedCommentType, FeedAuthor } from "@/lib/feedClient";
import { toggleLike, addComment, deleteComment, toggleEventLike, addEventComment, deleteEventComment, deletePost, editPost, toggleCommentLike } from "@/lib/feedClient";
import { OpenBookScoreBadge } from "@/components/OpenBookScoreBadge";
import type { SentimentBucket } from "@/lib/types";
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


function authorLabel(author: FeedAuthor): string {
  return author.username ? `@${author.username}` : author.displayName;
}

function AuthorLink({ author, currentUserId, children }: { author: FeedAuthor; currentUserId?: string | null; children: React.ReactNode }) {
  if (author.username) {
    const isSelf = currentUserId && author.userId === currentUserId;
    const href = isSelf ? "/profile" : `/friends/${encodeURIComponent(author.username)}`;
    return (
      <Link href={href} className="inline-flex items-center gap-1.5">
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

function BookThumbnail({ coverUrl, title, onClick }: { coverUrl: string; title: string; onClick?: () => void }) {
  if (!coverUrl) return null;
  return (
    <Image
      src={coverUrl}
      alt={title}
      width={40}
      height={60}
      className={`h-[60px] w-[40px] shrink-0 rounded-lg object-cover shadow-sm${onClick ? " cursor-pointer" : ""}`}
      unoptimized
      onClick={onClick}
    />
  );
}

function CommentLikeButton({ reactionId, source, initialCount, initialLiked }: {
  reactionId: string;
  source: "post" | "event";
  initialCount: number;
  initialLiked: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  async function handleToggle() {
    const ok = await toggleCommentLike(reactionId, source);
    if (ok) {
      setLiked((prev) => !prev);
      setCount((prev) => (liked ? prev - 1 : prev + 1));
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
        liked ? "text-red-500" : "text-foreground-muted/70 hover:text-red-400"
      }`}
    >
      {liked ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      )}
      {count > 0 ? count : null}
    </button>
  );
}

function CommentSection({
  targetId,
  targetType = "post",
  comments,
  currentUserId,
  onCommentAdded,
  likeButton,
}: {
  targetId: string;
  targetType?: "post" | "event";
  comments: FeedCommentType[];
  currentUserId: string | null;
  onCommentAdded: () => void;
  likeButton?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const inputRef = useState<HTMLInputElement | null>(null);

  const totalCount = comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);

  const doAddComment = targetType === "event" ? addEventComment : addComment;
  const doDeleteComment = targetType === "event" ? deleteEventComment : deleteComment;

  function handleReply(comment: FeedCommentType) {
    const label = authorLabel(comment.author);
    setReplyingTo({ id: comment.id, username: label });
    setText(`${label} `);
    setExpanded(true);
    setTimeout(() => inputRef[0]?.focus(), 0);
  }

  function cancelReply() {
    setReplyingTo(null);
    setText("");
  }

  async function handleDeleteComment(reactionId: string) {
    const ok = await doDeleteComment(targetId, reactionId);
    if (ok) onCommentAdded();
  }

  async function handleSend() {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const ok = await doAddComment(targetId, t, replyingTo?.id);
    setSending(false);
    if (ok) {
      setText("");
      setReplyingTo(null);
      onCommentAdded();
    }
  }

  const commentToggle = totalCount > 0 && !expanded ? (
    <button
      onClick={() => setExpanded(true)}
      className="inline-flex items-center gap-1 text-xs font-medium text-foreground-muted hover:text-accent"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      View {totalCount} comment{totalCount !== 1 ? "s" : ""}
    </button>
  ) : !expanded ? (
    <button
      onClick={() => setExpanded(true)}
      className="inline-flex items-center gap-1 text-xs font-medium text-foreground-muted"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Comment
    </button>
  ) : null;

  return (
    <div className="mt-2 border-t border-border pt-2 space-y-2">
      <div className="flex items-center gap-4">
        {likeButton}
        {commentToggle}
      </div>

      {expanded ? (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id}>
              {/* Top-level comment */}
              <div className="flex items-start gap-2.5">
                <AuthorLink author={c.author} currentUserId={currentUserId}>
                  <Avatar name={c.author.displayName} url={c.author.avatarUrl} />
                </AuthorLink>
                <div className="min-w-0 flex-1">
                  <div>
                    <AuthorLink author={c.author} currentUserId={currentUserId}>
                      <span className="text-xs font-semibold text-foreground">
                        {authorLabel(c.author)}
                      </span>
                    </AuthorLink>
                    <span className="ml-1.5 text-xs text-foreground/80">
                      {c.body}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-[10px] text-foreground-muted/60">{timeAgo(c.createdAt)}</span>
                    <CommentLikeButton
                      reactionId={c.id}
                      source={targetType}
                      initialCount={c.likeCount ?? 0}
                      initialLiked={c.userLiked ?? false}
                    />
                    <button
                      onClick={() => handleReply(c)}
                      className="text-[10px] font-semibold text-foreground-muted/70 hover:text-accent"
                    >
                      Reply
                    </button>
                    {c.author.userId === currentUserId ? (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-[10px] font-semibold text-foreground-muted/70 hover:text-red-400"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Threaded replies */}
              {c.replies?.length > 0 ? (
                <div className="ml-6 mt-1.5 border-l-2 border-border/60 pl-4">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex items-start gap-2 py-1">
                      <AuthorLink author={r.author} currentUserId={currentUserId}>
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft/40 text-[9px] font-semibold text-accent">
                          {r.author.avatarUrl ? (
                            <Image src={r.author.avatarUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" unoptimized />
                          ) : (
                            r.author.displayName.charAt(0).toUpperCase() || "?"
                          )}
                        </div>
                      </AuthorLink>
                      <div className="min-w-0 flex-1">
                        <div>
                          <AuthorLink author={r.author} currentUserId={currentUserId}>
                            <span className="text-[11px] font-semibold text-foreground">
                              {authorLabel(r.author)}
                            </span>
                          </AuthorLink>
                          <span className="ml-1.5 text-[11px] text-foreground/80">
                            {r.body}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-[10px] text-foreground-muted/60">{timeAgo(r.createdAt)}</span>
                          <CommentLikeButton
                            reactionId={r.id}
                            source={targetType}
                            initialCount={r.likeCount ?? 0}
                            initialLiked={r.userLiked ?? false}
                          />
                          {r.author.userId === currentUserId ? (
                            <button
                              onClick={() => handleDeleteComment(r.id)}
                              className="text-[10px] font-semibold text-foreground-muted/70 hover:text-red-400"
                            >
                              Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {replyingTo ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-foreground-muted">
            Replying to {replyingTo.username}
          </span>
          <button onClick={cancelReply} className="text-[10px] font-semibold text-foreground-muted/70 hover:text-red-400">
            ✕
          </button>
        </div>
      ) : null}

      {expanded ? (
        <div className="flex items-center gap-2">
          <input
            ref={(el) => { inputRef[0] = el; }}
            type="text"
            placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Write a comment..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            className="flex-1 rounded-full border border-border bg-background px-3.5 py-1.5 text-xs text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-sm disabled:opacity-30"
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export type FeedBookInfo = {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
};

type FeedCardProps = {
  item: FeedItem;
  currentUserId: string | null;
  onRefresh: () => void;
  onBookClick?: (book: FeedBookInfo) => void;
};

export function FeedCard({ item, currentUserId, onRefresh, onBookClick }: FeedCardProps) {
  const [liked, setLiked] = useState(item.userLiked ?? false);
  const [likeCount, setLikeCount] = useState(item.likes ?? 0);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.kind === "post" ? item.body : "");
  const [saving, setSaving] = useState(false);

  const isOwn = item.author.userId === currentUserId;

  async function handleToggleLike() {
    const ok = item.kind === "event"
      ? await toggleEventLike(item.id)
      : await toggleLike(item.id);
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
          <AuthorLink author={item.author} currentUserId={currentUserId}>
            <Avatar name={item.author.displayName} url={item.author.avatarUrl} />
          </AuthorLink>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-foreground">
                <AuthorLink author={item.author} currentUserId={currentUserId}>
                  <span className="font-semibold">{authorLabel(item.author)}</span>
                </AuthorLink>{" "}
                {verb}{" "}
                <span className="font-semibold">&ldquo;{item.bookTitle}&rdquo;</span>
              </p>
            </div>
            <p className="mt-0.5 text-[10px] text-foreground-muted">
              {timeAgo(item.createdAt)}
            </p>

            <button
              type="button"
              onClick={() => onBookClick?.({ bookId: item.bookId, title: item.bookTitle, author: item.bookAuthor, coverUrl: item.bookCoverUrl })}
              className="mt-2 flex w-full items-center gap-2 rounded-lg bg-accent-soft/10 px-2.5 py-1.5 text-left transition-colors hover:bg-accent-soft/20"
            >
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
              </div>
              {item.sentiment && item.derivedScore != null ? (
                <OpenBookScoreBadge
                  score={item.derivedScore}
                  bucket={item.sentiment as SentimentBucket}
                  width={52}
                  height={36}
                />
              ) : null}
            </button>

            {item.notes && !progressFraction ? (
              <p className="mt-1.5 text-xs italic text-foreground-muted">
                &ldquo;{item.notes}&rdquo;
              </p>
            ) : null}

          </div>
        </div>

      <CommentSection
        targetId={item.id}
        targetType="event"
        comments={item.comments}
        currentUserId={currentUserId}
        onCommentAdded={onRefresh}
        likeButton={
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 text-xs font-medium ${
              liked ? "text-red-500" : "text-foreground-muted"
            }`}
          >
            {liked ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            )}
            {likeCount > 0 ? likeCount : "Like"}
          </button>
        }
      />
    </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <div className="flex items-start gap-2.5">
        <AuthorLink author={item.author} currentUserId={currentUserId}>
          <Avatar name={item.author.displayName} url={item.author.avatarUrl} />
        </AuthorLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AuthorLink author={item.author} currentUserId={currentUserId}>
                <span className="text-sm font-semibold text-foreground">
                  {authorLabel(item.author)}
                </span>
              </AuthorLink>
              {item.clubName ? (
                <Link
                  href={`/clubs/${item.clubId}`}
                  className="truncate rounded-full bg-accent-soft/15 px-1.5 py-0.5 text-[10px] font-medium text-accent hover:bg-accent-soft/25"
                >
                  in {item.clubName}
                </Link>
              ) : null}
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
            <button
              type="button"
              onClick={() => onBookClick?.({ bookId: item.bookId!, title: item.bookTitle!, author: item.bookAuthor ?? "", coverUrl: item.bookCoverUrl ?? "" })}
              className="mt-2 flex w-full items-center gap-2 rounded-lg bg-accent-soft/10 px-2.5 py-1.5 text-left transition-colors hover:bg-accent-soft/20"
            >
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
            </button>
          ) : null}

        </div>
      </div>

      <CommentSection
        targetId={item.id}
        targetType="post"
        comments={item.comments}
        currentUserId={currentUserId}
        onCommentAdded={onRefresh}
        likeButton={
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 text-xs font-medium ${
              liked ? "text-red-500" : "text-foreground-muted"
            }`}
          >
            {liked ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            )}
            {likeCount > 0 ? likeCount : "Like"}
          </button>
        }
      />
    </div>
  );
}
