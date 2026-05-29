"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { FeedCard, type FeedBookInfo } from "@/components/FeedCard";
import { NewPostComposer } from "@/components/NewPostComposer";
import { BookPickerSheet } from "@/components/BookPickerSheet";
import { BookDetailSheet } from "@/components/BookDetailSheet";
import { FeedBookPreviewSheet } from "@/components/FeedBookPreviewSheet";
import { PairwiseComparisonSheet } from "@/components/PairwiseComparisonSheet";
import { InviteClubMemberSection } from "@/components/InviteClubMemberSection";
import { AddToShelfSheet } from "@/components/AddToShelfSheet";
import { ClubIcon } from "@/components/ClubIcon";
import { ClubIconPicker } from "@/components/ClubIconPicker";
import { ClubEditSheet } from "@/components/clubs/ClubEditSheet";
import { ClubSettingsSheet } from "@/components/clubs/ClubSettingsSheet";
import {
  IconChat,
  IconChevronRight,
  IconGlobe,
  IconChevronDown,
  IconLock,
  IconMail,
  IconOpenBook,
  IconUsers,
} from "@/components/clubs/clubIcons";
import { OverflowMenu, type OverflowMenuItem } from "@/components/OverflowMenu";
import { useNotificationCounts } from "@/components/NotificationCountsProvider";
import {
  fetchClubDetail,
  fetchClubFeed,
  updateClub,
  leaveClub,
  deleteClub,
  type ClubDetail,
  type ClubMember,
  type ClubBook,
} from "@/lib/clubClient";
import { markClubSeen } from "@/lib/notificationClient";
import { useReadingNook } from "@/lib/app-state";
import type { FeedItem } from "@/lib/feedClient";
import type { Book, BookId, SentimentBucket, Shelf } from "@/lib/types";

function MemberAvatar({ member }: { member: ClubMember }) {
  if (member.avatarUrl) {
    return (
      <Image
        src={member.avatarUrl}
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-background"
        unoptimized
      />
    );
  }
  const initial = member.displayName.charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft/40 text-sm font-semibold text-accent ring-2 ring-background">
      {initial}
    </div>
  );
}

function clubBookToBook(cb: ClubBook): Book {
  return {
    id: cb.id,
    title: cb.title,
    author: cb.author,
    coverUrl: cb.coverUrl,
    totalPages: 0,
    genres: [],
    description: "",
  };
}

function SectionHeading({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
      <span className="text-accent">{icon}</span>
      {children}
    </div>
  );
}

export default function ClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.clubId as string;

  const { state: appState, actions } = useReadingNook();
  const { refresh: refreshNotificationCounts } = useNotificationCounts();
  const [club, setClub] = useState<ClubDetail | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [addShelfOpen, setAddShelfOpen] = useState(false);
  const [composerBook, setComposerBook] = useState<Book | null>(null);
  const [composerKey, setComposerKey] = useState(0);
  const [detailBookId, setDetailBookId] = useState<BookId | null>(null);
  const [previewBook, setPreviewBook] = useState<FeedBookInfo | null>(null);
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: BookId | null;
    bucket: SentimentBucket | null;
    shareToFeed?: boolean;
  }>({ open: false, bookId: null, bucket: null });
  const mountedRef = useRef(true);

  const handleBookClick = useCallback(
    (book: FeedBookInfo) => {
      if (appState.catalog[book.bookId] && appState.userBooks[book.bookId]) {
        setDetailBookId(book.bookId);
      } else {
        setPreviewBook(book);
      }
    },
    [appState.catalog, appState.userBooks],
  );

  const loadClub = useCallback(() => {
    fetchClubDetail(clubId).then((data) => {
      if (!mountedRef.current) return;
      setClub(data);
      setLoading(false);
      if (data) {
        void markClubSeen(clubId).then(() => refreshNotificationCounts());
      }
    });
  }, [clubId, refreshNotificationCounts]);

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
    return () => {
      mountedRef.current = false;
    };
  }, [loadClub, loadFeed]);

  async function handleCopyInvite() {
    if (!club) return;
    try {
      await navigator.clipboard.writeText(club.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may not be available */
    }
  }

  async function handleSetBook(book: Book) {
    if (!club) return;
    const ok = await updateClub(club.id, {
      currentBook: { id: book.id, title: book.title, author: book.author, coverUrl: book.coverUrl },
    });
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

  async function handleMembersCanInviteChange(enabled: boolean) {
    if (!club) return;
    const ok = await updateClub(club.id, { membersCanInvite: enabled });
    if (ok) {
      setClub((prev) => (prev ? { ...prev, membersCanInvite: enabled } : prev));
    }
  }

  async function handleSaveClubEdit(data: {
    name: string;
    description: string;
    isPublic: boolean;
  }): Promise<boolean> {
    if (!club) return false;
    const ok = await updateClub(club.id, data);
    if (ok) {
      setClub((prev) =>
        prev
          ? {
              ...prev,
              name: data.name,
              description: data.description,
              isPublic: data.isPublic,
            }
          : prev,
      );
      void loadClub();
    }
    return ok;
  }

  const currentBookAsBook = useMemo(() => {
    if (!club?.currentBook) return null;
    const fromCatalog = appState.catalog[club.currentBook.id];
    return fromCatalog ?? clubBookToBook(club.currentBook);
  }, [club?.currentBook, appState.catalog]);

  const hasCurrentBookOnShelf = Boolean(
    club?.currentBook && appState.userBooks[club.currentBook.id],
  );

  function handlePostAboutCurrentBook() {
    if (!currentBookAsBook) return;
    setComposerBook(currentBookAsBook);
    setComposerKey((k) => k + 1);
    document.getElementById("club-discussion")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAddCurrentBookToShelf(shelf: Shelf, genres: string[], visibility: "public" | "private") {
    if (!currentBookAsBook) return;
    actions.addBookToShelf(currentBookAsBook.id, shelf, { ...currentBookAsBook, genres });
    actions.setUserBookVisibility(currentBookAsBook.id, visibility);
    if (genres.length > 0) {
      actions.updateCatalogGenres(currentBookAsBook.id, genres);
    }
    setAddShelfOpen(false);
  }

  if (loading) {
    return (
      <ThemedPageShell>
        <div className="py-16 text-center text-sm text-foreground-muted">Loading club…</div>
      </ThemedPageShell>
    );
  }

  if (!club) {
    return (
      <ThemedPageShell>
        <div className="py-12 text-center">
          <p className="text-sm font-semibold text-foreground">Club not found</p>
          <Link href="/clubs" className="mt-2 inline-block text-sm font-medium text-accent">
            Back to Clubs
          </Link>
        </div>
      </ThemedPageShell>
    );
  }

  const isAdmin = club.role === "admin";
  const isCreator = currentUserId === club.creatorId;
  const canInvite = isAdmin || Boolean(club.membersCanInvite);
  const existingMemberIds = club.members.map((m) => m.userId);
  const pendingInviteUserIds = club.pendingInviteUserIds ?? [];
  const menuItems: OverflowMenuItem[] = [
    {
      id: "edit",
      label: "Edit club",
      hidden: !isAdmin,
      onClick: () => setEditOpen(true),
    },
    {
      id: "icon",
      label: "Change icon",
      hidden: !isAdmin,
      onClick: () => setIconPickerOpen(true),
    },
    {
      id: "settings",
      label: "Club settings",
      hidden: !isCreator,
      onClick: () => setSettingsOpen(true),
    },
    {
      id: "leave",
      label: "Leave club",
      hidden: isCreator,
      onClick: () => void handleLeave(),
    },
    {
      id: "delete",
      label: "Delete club",
      hidden: !isCreator,
      destructive: true,
      onClick: () => void handleDelete(),
    },
  ];

  return (
    <ThemedPageShell>
      <div className="flex min-w-0 flex-col gap-5">
        {/* Page chrome */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/clubs"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card-surface/70 px-3 py-1.5 text-xs font-medium text-accent shadow-sm transition-colors hover:bg-accent-soft/10"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
            Clubs
          </Link>
          <OverflowMenu items={menuItems} ariaLabel="Club options" />
        </div>

        {/* Hero */}
        <section className="rounded-[1.35rem] border border-border/80 bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.04] sm:p-5">
          <div className="flex gap-4">
            <ClubIcon
              name={club.name}
              iconUrl={club.iconUrl ?? null}
              size="lg"
              className="!h-[4.5rem] !w-[4.5rem] shrink-0 sm:!h-20 sm:!w-20"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-semibold leading-tight text-foreground">
                  {club.name}
                </h1>
                {club.isPublic ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent-soft/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                    <IconGlobe />
                    Public
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[11px] font-semibold text-foreground-muted">
                    <IconLock />
                    Private
                  </span>
                )}
              </div>
              {club.description ? (
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{club.description}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-muted">
                <button
                  type="button"
                  onClick={() => setShowMembers((v) => !v)}
                  aria-expanded={showMembers}
                  className="inline-flex items-center gap-1.5 rounded-lg py-0.5 font-medium text-foreground transition-colors hover:text-accent"
                >
                  <IconUsers className="text-accent" />
                  <span>
                    {club.memberCount} member{club.memberCount !== 1 ? "s" : ""}
                  </span>
                  <IconChevronDown
                    className={`text-foreground-muted transition-transform ${
                      showMembers ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyInvite()}
                  className="inline-flex items-center gap-1.5 rounded-lg py-0.5 font-medium text-foreground transition-colors hover:text-accent"
                  aria-label={copied ? "Invite code copied" : "Copy invite code"}
                >
                  <IconMail className="text-accent/90" />
                  {copied ? "Copied!" : "Invite code available"}
                </button>
              </div>
            </div>
          </div>

          {showMembers ? (
            <div className="mt-4 border-t border-border/70 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Members
              </p>
              {canInvite ? (
                <InviteClubMemberSection
                  clubId={club.id}
                  existingMemberIds={existingMemberIds}
                  pendingInviteUserIds={pendingInviteUserIds}
                  currentUserId={currentUserId}
                  onInvited={loadClub}
                />
              ) : null}
              <div className={`flex flex-col gap-1 ${canInvite ? "mt-3" : ""}`}>
                {club.members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-accent-soft/5"
                  >
                    <MemberAvatar member={m} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-foreground">
                          {m.username ? `@${m.username}` : m.displayName}
                        </p>
                        {m.userId === club.creatorId ? (
                          <span className="shrink-0 rounded-full bg-accent-soft/20 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                            Club creator
                          </span>
                        ) : m.role === "admin" ? (
                          <span className="shrink-0 rounded-full bg-accent-soft/20 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
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
            </div>
          ) : null}
        </section>

        {/* Current club book */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <SectionHeading icon={<IconOpenBook />}>Current club book</SectionHeading>
            {isAdmin && club.currentBook ? (
              <button
                type="button"
                onClick={() => setBookPickerOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] font-semibold text-accent hover:bg-accent-soft/10"
              >
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Change
              </button>
            ) : null}
          </div>

          {club.currentBook ? (
            <div className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-gradient-to-b from-card-surface to-card-surface/80 p-4 shadow-sm ring-1 ring-black/[0.04]">
              <div className="flex gap-4">
                {club.currentBook.coverUrl ? (
                  <Image
                    src={club.currentBook.coverUrl}
                    alt=""
                    width={88}
                    height={132}
                    className="h-[132px] w-[88px] shrink-0 rounded-xl object-cover shadow-md ring-1 ring-black/[0.08]"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-[132px] w-[88px] shrink-0 items-center justify-center rounded-xl bg-accent-soft/20 text-accent">
                    <IconOpenBook className="h-8 w-8" />
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <p className="font-serif text-lg font-semibold leading-snug text-foreground">
                    {club.currentBook.title}
                  </p>
                  <p className="mt-1 text-sm text-foreground-muted">{club.currentBook.author}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                    <IconOpenBook className="h-3.5 w-3.5" />
                    Reading together
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    if (hasCurrentBookOnShelf) return;
                    setAddShelfOpen(true);
                  }}
                  disabled={hasCurrentBookOnShelf}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-accent bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-default disabled:opacity-60"
                >
                  {hasCurrentBookOnShelf ? "On your shelf" : "Add to my shelf"}
                </button>
                <button
                  type="button"
                  onClick={handlePostAboutCurrentBook}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm hover:bg-accent-soft/10"
                >
                  Post about this
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-card-surface/50 px-5 py-8 text-center shadow-inner">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft/15 text-accent">
                <IconOpenBook className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">No club book yet</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                Choose a book for the club to read together.
              </p>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setBookPickerOpen(true)}
                  className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-accent bg-accent px-5 text-sm font-semibold text-white shadow-sm"
                >
                  Set club book
                </button>
              ) : null}
            </div>
          )}
        </section>

        {/* Discussion */}
        <section id="club-discussion" className="flex flex-col gap-3 scroll-mt-4">
          <SectionHeading icon={<IconChat />}>Discussion</SectionHeading>
          <NewPostComposer
            key={composerKey}
            clubId={clubId}
            variant="club"
            initialBook={composerBook}
            onPosted={() => {
              loadFeed();
              setComposerBook(null);
            }}
          />
          {feedItems.length === 0 ? (
            <div className="flex gap-4 rounded-[1.35rem] border border-dashed border-border/70 bg-card-surface/50 p-5 shadow-inner">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft/12 text-accent/70">
                <IconChat className="h-7 w-7" />
              </div>
              <div className="min-w-0 py-1">
                <p className="text-sm font-semibold text-foreground">No posts yet</p>
                <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
                  Start the conversation about your current read.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {feedItems.map((item) => (
                <FeedCard
                  key={item.id}
                  item={item}
                  currentUserId={currentUserId}
                  onRefresh={loadFeed}
                  onBookClick={handleBookClick}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {isAdmin ? (
        <ClubEditSheet
          open={editOpen}
          name={club.name}
          description={club.description}
          isPublic={club.isPublic}
          onClose={() => setEditOpen(false)}
          onSave={handleSaveClubEdit}
        />
      ) : null}

      {isCreator ? (
        <ClubSettingsSheet
          open={settingsOpen}
          membersCanInvite={club.membersCanInvite}
          onClose={() => setSettingsOpen(false)}
          onMembersCanInviteChange={(enabled) => void handleMembersCanInviteChange(enabled)}
        />
      ) : null}

      {iconPickerOpen && isAdmin ? (
        <dialog
          open
          className="fixed inset-0 z-[110] m-0 flex max-h-none max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-black/35"
          onClose={() => setIconPickerOpen(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIconPickerOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-4 shadow-2xl">
            <p className="mb-3 text-center font-serif text-lg font-semibold text-foreground">
              Club icon
            </p>
            <ClubIconPicker
              clubId={club.id}
              name={club.name}
              iconUrl={club.iconUrl ?? null}
              showHint={false}
              onIconChange={(url) => {
                setClub((prev) => (prev ? { ...prev, iconUrl: url } : prev));
              }}
            />
            <button
              type="button"
              onClick={() => setIconPickerOpen(false)}
              className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground-muted"
            >
              Done
            </button>
          </div>
        </dialog>
      ) : null}

      <BookPickerSheet
        open={bookPickerOpen}
        onClose={() => setBookPickerOpen(false)}
        onPick={(book) => {
          void handleSetBook(book);
          setBookPickerOpen(false);
        }}
      />

      <AddToShelfSheet
        open={addShelfOpen}
        book={currentBookAsBook}
        onClose={() => setAddShelfOpen(false)}
        onChooseShelf={handleAddCurrentBookToShelf}
      />

      {detailBookId && appState.catalog[detailBookId] && appState.userBooks[detailBookId] ? (
        <BookDetailSheet
          bookId={detailBookId}
          onClose={() => setDetailBookId(null)}
          onStartPairwise={(bookId, bucket, options) => {
            setDetailBookId(null);
            setPairwise({
              open: true,
              bookId,
              bucket,
              shareToFeed: options?.shareToFeed,
            });
          }}
        />
      ) : null}

      {previewBook ? (
        <FeedBookPreviewSheet book={previewBook} onClose={() => setPreviewBook(null)} />
      ) : null}

      {pairwise.open && pairwise.bookId && pairwise.bucket ? (
        <PairwiseComparisonSheet
          newBookId={pairwise.bookId}
          bucket={pairwise.bucket}
          shareToFeed={pairwise.shareToFeed}
          onDone={() => setPairwise({ open: false, bookId: null, bucket: null })}
        />
      ) : null}
    </ThemedPageShell>
  );
}
