"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EditProfileSheet } from "@/components/EditProfileSheet";
import { ProfileFavoritesSection } from "@/components/ProfileFavoritesSection";
import { ProfileHeroCard } from "@/components/ProfileHeroCard";
import { ProfileRecentInsights } from "@/components/ProfileRecentInsights";
import { ProfileShelfBars, profileShelfBarRows } from "@/components/ProfileShelfBars";
import { ProfileSocialTallies } from "@/components/ProfileSocialTallies";
import {
  SocialConnectionsSheet,
  type SocialConnectionUser,
} from "@/components/SocialConnectionsSheet";
import { PageShell } from "@/components/PageShell";
import { PairwiseComparisonSheet } from "@/components/PairwiseComparisonSheet";
import { RatedBookDetailSheet } from "@/components/RatedBookDetailSheet";
import { ProfileDecorationBackdrop } from "@/components/ProfileDecorationBackdrop";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useReadingNook } from "@/lib/app-state";
import {
  buildSentimentInsights,
  getFavoriteAuthors,
  getFavoriteBook,
  getFavoriteGenres,
  getShelfCounts,
  ratedFinishedCount,
} from "@/lib/profileStats";
import type { BookId, SentimentBucket } from "@/lib/types";

type AcceptedFriend = SocialConnectionUser & { direction: "incoming" | "outgoing" };

export default function ProfilePage() {
  const { state } = useReadingNook();
  const { user: cloudUser, configured: cloudConfigured } = useSupabaseAuth();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [detailBookId, setDetailBookId] = useState<BookId | null>(null);
  const [pairwise, setPairwise] = useState<{
    open: boolean;
    bookId: BookId | null;
    bucket: SentimentBucket | null;
  }>({ open: false, bookId: null, bucket: null });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [usernameRefreshKey, setUsernameRefreshKey] = useState(0);
  const [friends, setFriends] = useState<AcceptedFriend[] | null>(null);
  const [socialSheet, setSocialSheet] = useState<"following" | "followers" | null>(null);

  useEffect(() => {
    if (!cloudConfigured || !cloudUser) return;
    void fetch("/api/profile/avatar")
      .then((res) => res.json())
      .then((data: { avatarUrl?: string | null }) => setAvatarUrl(data.avatarUrl ?? null))
      .catch(() => undefined);
  }, [cloudConfigured, cloudUser]);

  const canLoadSocial = cloudConfigured && Boolean(cloudUser);

  useEffect(() => {
    if (!canLoadSocial) return;
    void fetch("/api/friends")
      .then((res) => res.json())
      .then(
        (data: {
          friends?: Array<{
            status: string;
            direction: "incoming" | "outgoing";
            userId: string;
            username: string | null;
            displayName: string;
            avatarUrl: string | null;
            tagline: string;
          }>;
        }) => {
          const accepted = (data.friends ?? []).filter((f) => f.status === "accepted");
          setFriends(
            accepted.map((f) => ({
              userId: f.userId,
              username: f.username,
              displayName: f.displayName,
              avatarUrl: f.avatarUrl,
              tagline: f.tagline,
              direction: f.direction,
            })),
          );
        },
      )
      .catch(() => setFriends(null));
  }, [canLoadSocial]);

  const followingList = useMemo(() => friends ?? [], [friends]);
  const followersList = useMemo(
    () => (friends ?? []).filter((f) => f.direction === "incoming"),
    [friends],
  );
  const followingCount = canLoadSocial ? (friends == null ? null : followingList.length) : null;
  const followersCount = canLoadSocial ? (friends == null ? null : followersList.length) : null;

  const shelfCounts = useMemo(() => getShelfCounts(state), [state]);
  const shelfRows = useMemo(() => profileShelfBarRows(shelfCounts), [shelfCounts]);
  const favoriteBook = useMemo(() => getFavoriteBook(state), [state]);
  const topGenres = useMemo(() => getFavoriteGenres(state, 5), [state]);
  const topAuthors = useMemo(() => getFavoriteAuthors(state, 3), [state]);
  const sentimentInsights = useMemo(() => buildSentimentInsights(state), [state]);
  const ratedCount = useMemo(() => ratedFinishedCount(state), [state]);

  const profileTheme = state.profile.theme ?? "plant";
  const profileEditGated = cloudConfigured && !cloudUser;
  const socialGated = cloudConfigured && !cloudUser;

  return (
    <PageShell>
      {editProfileOpen ? (
        <EditProfileSheet
          profile={state.profile}
          onClose={() => {
            setEditProfileOpen(false);
            setUsernameRefreshKey((k) => k + 1);
          }}
          onUsernameSaved={() => setUsernameRefreshKey((k) => k + 1)}
          onAvatarChange={setAvatarUrl}
        />
      ) : null}
      <div className="relative isolate -mx-4 overflow-hidden sm:-mx-6">
        <ProfileDecorationBackdrop theme={profileTheme} />
        <div className="relative z-10 flex flex-col gap-3 px-4 sm:px-6">
          {profileEditGated ? (
            <p className="rounded-xl border border-border/80 bg-card-surface/90 px-3 py-2.5 text-center text-xs text-foreground-muted backdrop-blur-[1px]">
              Profile name, tagline, and themes sync when you{" "}
              <Link
                href="/login?next=/profile"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                sign in
              </Link>
              .
            </p>
          ) : null}

          {shelfCounts.total === 0 ? (
            <>
              <ProfileHeroCard
                displayName={state.profile.displayName}
                tagline={state.profile.tagline}
                avatarUrl={avatarUrl}
                cloudConfigured={cloudConfigured}
                cloudUser={Boolean(cloudUser)}
                profileEditGated={profileEditGated}
                usernameRefreshKey={usernameRefreshKey}
                onEditProfile={() => setEditProfileOpen(true)}
              />
              <ProfileSocialTallies
                followingCount={followingCount}
                followersCount={followersCount}
                gated={socialGated}
                onFollowingPress={canLoadSocial ? () => setSocialSheet("following") : undefined}
                onFollowersPress={canLoadSocial ? () => setSocialSheet("followers") : undefined}
              />
              {!socialGated ? (
                <p className="-mt-1 text-center text-[11px] leading-snug text-foreground-muted">
                  Following lists your friends. One-way follows for public accounts are coming later.
                </p>
              ) : null}
              <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/75 px-4 py-8 text-center shadow-inner backdrop-blur-[1px]">
                <p className="font-medium text-foreground">Your nook is empty</p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">
                  Add a few books to start tracking your reading and taste.
                </p>
                <Link
                  href="/add"
                  className="mt-4 inline-flex min-h-11 min-w-[8.5rem] items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
                >
                  Go to Add
                </Link>
              </div>
            </>
          ) : (
            <>
              <ProfileHeroCard
                displayName={state.profile.displayName}
                tagline={state.profile.tagline}
                avatarUrl={avatarUrl}
                cloudConfigured={cloudConfigured}
                cloudUser={Boolean(cloudUser)}
                profileEditGated={profileEditGated}
                usernameRefreshKey={usernameRefreshKey}
                onEditProfile={() => setEditProfileOpen(true)}
              />
              <ProfileSocialTallies
                followingCount={followingCount}
                followersCount={followersCount}
                gated={socialGated}
                onFollowingPress={canLoadSocial ? () => setSocialSheet("following") : undefined}
                onFollowersPress={canLoadSocial ? () => setSocialSheet("followers") : undefined}
              />
              {!socialGated ? (
                <p className="-mt-1 text-center text-[11px] leading-snug text-foreground-muted">
                  Following lists your friends. One-way follows for public accounts are coming later.
                </p>
              ) : null}
              <ProfileShelfBars rows={shelfRows} />
              <ProfileFavoritesSection
                title="Your Favorites"
                favoriteBook={favoriteBook}
                topGenres={topGenres}
                topAuthors={topAuthors}
                onFavoriteBookClick={
                  favoriteBook ? () => setDetailBookId(favoriteBook.bookId) : undefined
                }
              />
              <ProfileRecentInsights
                insights={sentimentInsights}
                ratedFinishedCount={ratedCount}
                mode="self"
              />
            </>
          )}
        </div>
      </div>

      {detailBookId && state.catalog[detailBookId] && state.userBooks[detailBookId] ? (
        <RatedBookDetailSheet
          bookId={detailBookId}
          onClose={() => setDetailBookId(null)}
          onStartPairwise={(bookId, bucket) => {
            setDetailBookId(null);
            setPairwise({ open: true, bookId, bucket });
          }}
        />
      ) : null}

      {pairwise.open && pairwise.bookId && pairwise.bucket ? (
        <PairwiseComparisonSheet
          newBookId={pairwise.bookId}
          bucket={pairwise.bucket}
          onDone={() => setPairwise({ open: false, bookId: null, bucket: null })}
        />
      ) : null}

      {socialSheet === "following" ? (
        <SocialConnectionsSheet
          title="Following"
          users={followingList}
          onClose={() => setSocialSheet(null)}
        />
      ) : null}
      {socialSheet === "followers" ? (
        <SocialConnectionsSheet
          title="Followers"
          users={followersList}
          onClose={() => setSocialSheet(null)}
        />
      ) : null}
    </PageShell>
  );
}
