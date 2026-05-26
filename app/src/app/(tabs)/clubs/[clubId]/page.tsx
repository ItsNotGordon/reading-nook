"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { FeedCard } from "@/components/FeedCard";
import { NewPostComposer } from "@/components/NewPostComposer";
import { BookPickerSheet } from "@/components/BookPickerSheet";
import { fetchClubDetail, fetchClubFeed, updateClub, leaveClub, deleteClub, type ClubDetail, type ClubMember } from "@/lib/clubClient";
import type { FeedItem } from "@/lib/feedClient";
import type { Book } from "@/lib/types";

function MemberAvatar({ member }: { member: ClubMember }) {
  if (member.avatarUrl) {
    return (
      <Image
        src={member.avatarUrl}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        unoptimized
      />
    );
  }
  const initial = member.displayName.charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft/40 text-xs font-semibold text-accent">
      {initial}
    </div>
  );
}

export default function ClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.clubId as string;

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const mountedRef = useRef(true);

  const loadClub = useCallback(() => {
    fetchClubDetail(clubId).then((data) => {
      if (!mountedRef.current) return;
      setClub(data);
      setLoading(false);
    });
  }, [clubId]);

  const loadFeed = useCallback(() => {
    fetchClubFeed(clubId).then((resp) => {
      if (!mountedRef.current) return;
      setFeedItems(resp.items);
      setCurrentUserId(resp.currentUserId);
    });
  }, [clubId]);

  useEffect(() => {
    mountedRef.current = true;
    loadClub();
    loadFeed();
    return () => { mountedRef.current = false; };
  }, [loadClub, loadFeed]);

  async function handleCopyInvite() {
    if (!club) return;
    try {
      await navigator.clipboard.writeText(club.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may not be available */ }
  }

  async function handleSetBook(book: Book) {
    if (!club) return;
    const ok = await updateClub(club.id, {
      currentBook: { id: book.id, title: book.title, author: book.author, coverUrl: book.coverUrl },
    });
    if (ok) loadClub();
  }

  async function handleClearBook() {
    if (!club) return;
    const ok = await updateClub(club.id, { currentBook: null });
    if (ok) loadClub();
  }

  async function handleLeave() {
    if (!club || !confirm("Leave this club?")) return;
    const ok = await leaveClub(club.id);
    if (ok) router.push("/clubs");
  }

  async function handleDelete() {
    if (!club || !confirm("Delete this club? This cannot be undone.")) return;
    const ok = await deleteClub(club.id);
    if (ok) router.push("/clubs");
  }

  if (loading) {
    return (
      <ThemedPageShell>
        <div className="py-12 text-center text-xs text-foreground-muted">Loading club...</div>
      </ThemedPageShell>
    );
  }

  if (!club) {
    return (
      <ThemedPageShell>
        <div className="py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Club not found</p>
          <Link href="/clubs" className="mt-2 inline-block text-xs font-medium text-accent">
            Back to Clubs
          </Link>
        </div>
      </ThemedPageShell>
    );
  }

  const isAdmin = club.role === "admin";
  const isCreator = currentUserId === club.creatorId;

  return (
    <ThemedPageShell>
      <div className="flex flex-col gap-4">
        {/* Back link */}
        <Link href="/clubs" className="inline-flex items-center gap-1 text-xs font-medium text-accent">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Clubs
        </Link>

        {/* Club header */}
        <div className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03]">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-semibold text-foreground">{club.name}</h1>
                {club.isPublic ? (
                  <span className="shrink-0 rounded-full bg-accent-soft/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                    Public
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-foreground-muted/10 px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                    Private
                  </span>
                )}
              </div>
              {club.description ? (
                <p className="mt-1 text-sm text-foreground-muted">{club.description}</p>
              ) : null}
              <p className="mt-1.5 text-[10px] text-foreground-muted">
                {club.memberCount} member{club.memberCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Invite code */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleCopyInvite}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors active:bg-accent-soft/20"
            >
              <svg className="h-3.5 w-3.5 text-accent" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.44A1.5 1.5 0 008.378 6H4.5z" />
              </svg>
              {copied ? "Copied!" : `Invite: ${club.inviteCode}`}
            </button>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            {!isCreator ? (
              <button
                onClick={handleLeave}
                className="rounded-xl border border-red-200 bg-card-surface px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Leave Club
              </button>
            ) : null}
            {isCreator ? (
              <button
                onClick={handleDelete}
                className="rounded-xl border border-red-200 bg-card-surface px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Delete Club
              </button>
            ) : null}
          </div>
        </div>

        {/* Current Book */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Current Book
            </h2>
            {isAdmin ? (
              <button
                onClick={club.currentBook ? handleClearBook : () => setBookPickerOpen(true)}
                className="text-[10px] font-medium text-accent"
              >
                {club.currentBook ? "Change" : "Set Book"}
              </button>
            ) : null}
          </div>
          {club.currentBook ? (
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03]">
              {club.currentBook.coverUrl ? (
                <Image
                  src={club.currentBook.coverUrl}
                  alt=""
                  width={44}
                  height={66}
                  className="h-[66px] w-[44px] shrink-0 rounded-lg object-cover shadow-sm"
                  unoptimized
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{club.currentBook.title}</p>
                <p className="truncate text-xs text-foreground-muted">{club.currentBook.author}</p>
              </div>
            </div>
          ) : (
            <div className="mt-2 rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-4 text-center shadow-inner">
              <p className="text-xs text-foreground-muted">
                {isAdmin ? "No book selected yet. Tap \"Set Book\" to pick one." : "No book selected yet."}
              </p>
            </div>
          )}
        </section>

        {/* Members */}
        <section>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Members ({club.memberCount})
            </h2>
            <svg
              className={`h-3.5 w-3.5 text-foreground-muted transition-transform ${showMembers ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          {showMembers ? (
            <div className="mt-2 flex flex-col gap-1">
              {club.members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                  <MemberAvatar member={m} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-foreground">
                        {m.username ? `@${m.username}` : m.displayName}
                      </p>
                      {m.role === "admin" ? (
                        <span className="shrink-0 rounded-full bg-accent-soft/20 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                          Admin
                        </span>
                      ) : null}
                    </div>
                    {m.username ? (
                      <p className="text-[10px] text-foreground-muted">{m.displayName}</p>
                    ) : null}
                  </div>
                  {m.username && m.userId !== currentUserId ? (
                    <Link
                      href={`/friends/${encodeURIComponent(m.username)}`}
                      className="text-[10px] font-medium text-accent"
                    >
                      Profile
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Club Feed */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Club Feed
          </h2>
          <NewPostComposer onPosted={loadFeed} clubId={clubId} />
          {feedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-6 text-center shadow-inner">
              <p className="text-xs text-foreground-muted">
                No posts yet. Be the first to share something!
              </p>
            </div>
          ) : (
            feedItems.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                currentUserId={currentUserId}
                onRefresh={loadFeed}
              />
            ))
          )}
        </section>
      </div>

      <BookPickerSheet
        open={bookPickerOpen}
        onClose={() => setBookPickerOpen(false)}
        onPick={(book) => {
          handleSetBook(book);
          setBookPickerOpen(false);
        }}
      />
    </ThemedPageShell>
  );
}
