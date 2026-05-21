"use client";

import { useCallback, useEffect, useState } from "react";
import { FriendCompareTaste } from "@/components/FriendCompareTaste";
import { FriendProfileInsights } from "@/components/FriendProfileInsights";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProfileSocialTallies } from "@/components/ProfileSocialTallies";
import type { FriendProfileSummary } from "@/lib/friendProfileSummary";
import type { FriendRelationship } from "@/lib/friendshipStatus";
import type { TasteComparison } from "@/lib/tasteComparison";
import type { Shelf } from "@/lib/types";

type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  tagline: string;
  relationship: FriendRelationship;
  friendshipId: string | null;
  followingCount?: number;
  followersCount?: number;
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
  const [shelvesOpen, setShelvesOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);
  const [focusShelf, setFocusShelf] = useState<Shelf | null>(null);

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
    if (data.relationship === "accepted") {
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

  const isAccepted = profile?.relationship === "accepted";

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
          <button
            type="button"
            disabled={busy}
            onClick={() => void sendFriendRequest()}
            className="mt-4 min-h-11 w-full rounded-xl border border-accent bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            Add friend
          </button>
        ) : null}
        {profile.relationship === "pending_outgoing" ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-foreground-muted">Friend request sent</p>
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

      {isAccepted ? (
        <>
          <ProfileSocialTallies
            followingCount={profile.followingCount ?? null}
            followersCount={profile.followersCount ?? null}
          />

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
                  <FriendCompareTaste comparison={taste.comparison} friendName={profile.displayName} />
                ) : (
                  <p className="text-xs text-foreground-muted">Could not load taste comparison.</p>
                )}
              </div>
            ) : null}
          </section>

          {insights === "loading" ? (
            <p className="text-sm text-foreground-muted">Loading library and insights…</p>
          ) : insights ? (
            <FriendProfileInsights
              summary={insights}
              focusShelf={focusShelf}
              shelvesOpen={shelvesOpen}
              ratingsOpen={ratingsOpen}
              onShelvesOpenChange={setShelvesOpen}
              onRatingsOpenChange={setRatingsOpen}
              onShelfRowFocus={(shelf) => {
                if (shelf === "finished") setRatingsOpen(true);
                else setShelvesOpen(true);
                setFocusShelf(shelf);
                window.setTimeout(() => setFocusShelf(null), 400);
              }}
            />
          ) : (
            <p className="text-sm text-foreground-muted">Could not load their reading profile.</p>
          )}
        </>
      ) : null}

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
