"use client";

import { useCallback, useEffect, useState } from "react";
import { FriendBookCompareSheet } from "@/components/FriendBookCompareSheet";
import { FriendCompareTaste } from "@/components/FriendCompareTaste";
import { FriendProfileInsights } from "@/components/FriendProfileInsights";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileSocialTallies } from "@/components/ProfileSocialTallies";
import {
  SocialConnectionsSheet,
  type SocialConnectionUser,
} from "@/components/SocialConnectionsSheet";
import type { FriendProfileSummary } from "@/lib/friendProfileSummary";
import type { FriendRelationship } from "@/lib/friendshipStatus";
import {
  findFriendBookSnapshot,
  friendBookFromSharedRated,
  friendBookFromShelf,
  type FriendBookSnapshot,
} from "@/lib/friendBookCompare";
import type { TasteComparison } from "@/lib/tasteComparison";
import type { BookId } from "@/lib/types";

type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  tagline: string;
  isPublic?: boolean;
  relationship: FriendRelationship;
  friendshipId: string | null;
  viewerFollows?: boolean;
  targetFollowsViewer?: boolean;
  followingCount?: number | null;
  followersCount?: number | null;
};

type TasteResponse = {
  displayName: string;
  shelfCounts: { reading: number; finished: number; want: number } | null;
  comparison: TasteComparison | null;
};

type FriendProfileSummaryResponse = FriendProfileSummary & {
  displayName: string;
  username: string | null;
};

type FriendProfileViewProps = {
  username: string;
  onFriendsChange?: () => void;
};

async function patchFriendship(friendshipId: string, action: "accept" | "decline" | "cancel") {
  const res = await fetch("/api/friends", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friendshipId, action }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
}

export function FriendProfileView({ username, onFriendsChange }: FriendProfileViewProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tasteOpen, setTasteOpen] = useState(false);
  const [taste, setTaste] = useState<TasteResponse | "loading" | null>(null);
  const [insights, setInsights] = useState<FriendProfileSummaryResponse | "loading" | null>(null);
  const [compareBookId, setCompareBookId] = useState<BookId | null>(null);
  const [socialSheet, setSocialSheet] = useState<"following" | "followers" | null>(null);
  const [followingList, setFollowingList] = useState<SocialConnectionUser[] | null>(null);
  const [followersList, setFollowersList] = useState<SocialConnectionUser[] | null>(null);

  const loadProfile = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
    const data = (await res.json().catch(() => ({}))) as PublicProfile & { error?: string };
    if (!res.ok) {
      setProfile(null);
      setInsights(null);
      setTaste(null);
      setError(data.error ?? "Could not load profile.");
      return;
    }
    setInsights(null);
    setTaste(null);
    setProfile(data);
    document.title = `${data.displayName} · Reading Nook`;
    if (data.relationship === "friends") {
      setTaste("loading");
      setInsights("loading");
      const [insightsRes, tasteRes] = await Promise.all([
        fetch(`/api/friends/${data.id}/profile`),
        fetch(`/api/friends/${data.id}/taste`),
      ]);
      if (insightsRes.ok) {
        setInsights((await insightsRes.json()) as FriendProfileSummaryResponse);
      } else {
        setInsights(null);
      }
      if (tasteRes.ok) {
        setTaste((await tasteRes.json()) as TasteResponse);
      } else {
        setTaste(null);
      }
    }
  }, [username]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadProfile();
    });
    return () => cancelAnimationFrame(frame);
  }, [loadProfile]);

  async function followAction(method: "POST" | "DELETE") {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(profile.username)}/follow`,
        { method },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update follow.");
      await loadProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendFriendRequest() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send request.");
      await loadProfile();
      onFriendsChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function friendshipAction(action: "accept" | "decline" | "cancel") {
    if (!profile?.friendshipId) return;
    setBusy(true);
    setError(null);
    try {
      await patchFriendship(profile.friendshipId, action);
      await loadProfile();
      onFriendsChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const isFriend = profile?.relationship === "friends";
  const showSocialTallies =
    profile?.followingCount != null && profile?.followersCount != null;
  const canFollowPublic =
    profile?.isPublic &&
    !isFriend &&
    profile.relationship !== "pending_incoming";

  const openSocialSheet = useCallback(
    async (which: "following" | "followers") => {
      setSocialSheet(which);
      if (which === "following" && followingList !== null) return;
      if (which === "followers" && followersList !== null) return;
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(username)}/friends?list=${which}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { users?: SocialConnectionUser[] };
        if (which === "following") {
          setFollowingList(data.users ?? []);
        } else {
          setFollowersList(data.users ?? []);
        }
      } catch {
        if (which === "following") setFollowingList([]);
        else setFollowersList([]);
      }
    },
    [username, followingList, followersList],
  );

  const openBookCompare = (bookId: BookId) => {
    setCompareBookId(bookId);
  };

  const friendBookForSheet: FriendBookSnapshot | null = (() => {
    if (!compareBookId) return null;
    if (insights && insights !== "loading") {
      const fromLibrary = findFriendBookSnapshot(
        compareBookId,
        insights.ratings,
        insights.books,
      );
      if (fromLibrary) return fromLibrary;
      const shelved = insights.books.find((b) => b.id === compareBookId);
      if (shelved) return friendBookFromShelf(shelved);
    }
    const shared =
      taste && taste !== "loading"
        ? taste.comparison?.sharedRatedBooks.find((r) => r.bookId === compareBookId)
        : undefined;
    if (shared) return friendBookFromSharedRated(shared);
    if (process.env.NODE_ENV === "development") {
      console.warn("[FriendProfileView] compare book not found:", compareBookId);
    }
    return null;
  })();

  if (!profile && !error) {
    return <p className="text-sm text-foreground-muted">Loading…</p>;
  }

  if (error && !profile) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <section className="relative rounded-[1.75rem] border border-border bg-card-surface/95 p-5 pt-10 text-center shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
        <p className="absolute end-4 top-4 max-w-[45%] truncate text-sm font-medium text-foreground-muted">
          {profile.displayName}
        </p>

        <ProfileAvatar
          name={profile.displayName}
          avatarUrl={profile.avatarUrl}
          size="lg"
          className="mx-auto bg-background"
        />

        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-foreground">
          {profile.username}
        </h1>
        {profile.tagline ? (
          <p className="mt-2 text-sm italic text-foreground-muted">{profile.tagline}</p>
        ) : null}

        {profile.relationship === "none" ? (
          <div className="mt-4 space-y-2">
            {profile.isPublic ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void followAction(profile.viewerFollows ? "DELETE" : "POST")}
                className="min-h-11 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground disabled:opacity-60"
              >
                {profile.viewerFollows ? "Unfollow" : "Follow"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendFriendRequest()}
              className="min-h-11 w-full rounded-xl border border-accent bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {profile.isPublic ? "Add friend" : "Request friend"}
            </button>
          </div>
        ) : null}
        {profile.relationship === "pending_outgoing" ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-foreground-muted">Friend request sent</p>
            {canFollowPublic ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void followAction(profile.viewerFollows ? "DELETE" : "POST")}
                className="min-h-10 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold"
              >
                {profile.viewerFollows ? "Unfollow" : "Follow"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void friendshipAction("cancel")}
              className="min-h-10 w-full rounded-xl border border-border bg-background px-4 text-sm font-semibold"
            >
              Cancel request
            </button>
          </div>
        ) : null}
        {profile.relationship === "pending_incoming" ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void friendshipAction("accept")}
              className="min-h-10 flex-1 rounded-xl border border-accent bg-accent px-4 text-sm font-semibold text-white"
            >
              Accept
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void friendshipAction("decline")}
              className="min-h-10 flex-1 rounded-xl border border-border bg-background px-4 text-sm font-semibold"
            >
              Decline
            </button>
          </div>
        ) : null}
      </section>

      {showSocialTallies ? (
        <ProfileSocialTallies
          followingCount={profile.followingCount ?? null}
          followersCount={profile.followersCount ?? null}
          onFollowingPress={() => void openSocialSheet("following")}
          onFollowersPress={() => void openSocialSheet("followers")}
        />
      ) : null}

      {isFriend ? (
        <>
          <section className="rounded-xl border border-border/60 bg-card-surface/50 p-3">
            <button
              type="button"
              onClick={() => setTasteOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground"
            >
              Compare taste with you
              <span className="text-foreground-muted">{tasteOpen ? "−" : "+"}</span>
            </button>
            {tasteOpen ? (
              <div className="mt-2">
                {taste === "loading" ? (
                  <p className="text-xs text-foreground-muted">Loading taste…</p>
                ) : taste?.comparison ? (
                  <FriendCompareTaste
                    comparison={taste.comparison}
                    friendName={profile.displayName}
                    onBookPress={openBookCompare}
                  />
                ) : (
                  <p className="text-xs text-foreground-muted">Could not load taste comparison.</p>
                )}
              </div>
            ) : null}
          </section>

          {insights === "loading" ? (
            <p className="text-sm text-foreground-muted">Loading library and insights…</p>
          ) : insights ? (
            <FriendProfileInsights summary={insights} onBookPress={openBookCompare} />
          ) : (
            <p className="text-sm text-foreground-muted">Could not load their reading profile.</p>
          )}
        </>
      ) : null}

      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      {compareBookId ? (
        <FriendBookCompareSheet
          key={compareBookId}
          bookId={compareBookId}
          friendDisplayName={profile.displayName}
          friendBook={friendBookForSheet}
          onClose={() => setCompareBookId(null)}
        />
      ) : null}

      {socialSheet === "following" ? (
        <SocialConnectionsSheet
          title="Following"
          users={followingList ?? []}
          onClose={() => setSocialSheet(null)}
        />
      ) : null}
      {socialSheet === "followers" ? (
        <SocialConnectionsSheet
          title="Followers"
          users={followersList ?? []}
          onClose={() => setSocialSheet(null)}
        />
      ) : null}
    </div>
  );
}
