"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FriendRelationship } from "@/lib/friendshipStatus";
import type { FriendProfileSummary } from "@/lib/friendProfileSummary";
import { FriendProfileInsights } from "@/components/FriendProfileInsights";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import type { TasteComparison } from "@/lib/tasteComparison";

type PublicProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  tagline: string;
  relationship: FriendRelationship;
  friendshipId: string | null;
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

type FriendProfileSheetProps = {
  username: string;
  onClose: () => void;
  onFriendsChange: () => void;
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

export function FriendProfileSheet({ username, onClose, onFriendsChange }: FriendProfileSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tasteOpen, setTasteOpen] = useState(false);
  const [taste, setTaste] = useState<TasteResponse | "loading" | null>(null);
  const [insights, setInsights] = useState<FriendProfileSummaryResponse | "loading" | null>(null);

  const loadProfile = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
    const data = (await res.json().catch(() => ({}))) as PublicProfile & { error?: string };
    if (!res.ok) {
      setProfile(null);
      setInsights(null);
      setError(data.error ?? "Could not load profile.");
      return;
    }
    setInsights(null);
    setTaste(null);
    setProfile(data);
    if (data.relationship === "accepted") {
      setInsights("loading");
      const insightsRes = await fetch(`/api/friends/${data.id}/profile`);
      if (insightsRes.ok) {
        setInsights((await insightsRes.json()) as FriendProfileSummaryResponse);
      }
    }
  }, [username]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadProfile();
    });
    return () => cancelAnimationFrame(frame);
  }, [loadProfile]);

  const loadTaste = useCallback(async (friendId: string) => {
    setTaste("loading");
    const res = await fetch(`/api/friends/${friendId}/taste`);
    if (!res.ok) {
      setTaste(null);
      return;
    }
    setTaste((await res.json()) as TasteResponse);
  }, []);

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
      onFriendsChange();
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
      onFriendsChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  const isAccepted = profile?.relationship === "accepted";

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[115] m-0 max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/35 [&::backdrop]:bg-black/35"
      aria-labelledby={headingId}
      onClose={() => onClose()}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 cursor-default border-0 bg-black/35 p-0"
          aria-label="Dismiss"
          tabIndex={-1}
          onClick={() => onClose()}
        />
        <div className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl sm:rounded-2xl">
          <div className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <p id={headingId} className="font-serif text-lg font-semibold text-foreground">
                Profile
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => onClose()}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground-muted"
              >
                ×
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!profile && !error ? (
              <p className="text-sm text-foreground-muted">Loading…</p>
            ) : error && !profile ? (
              <p className="text-sm text-red-700">{error}</p>
            ) : profile ? (
              <div className="space-y-4">
                <div className="space-y-4 text-center">
                  <ProfileAvatar
                    name={profile.displayName}
                    avatarUrl={profile.avatarUrl}
                    size="lg"
                    className="mx-auto"
                  />
                  <div>
                    <p className="font-serif text-2xl font-semibold text-foreground">{profile.displayName}</p>
                    <p className="mt-1 text-sm text-foreground-muted">@{profile.username}</p>
                    {profile.tagline ? (
                      <p className="mt-2 text-sm italic text-foreground-muted">{profile.tagline}</p>
                    ) : null}
                  </div>

                  {profile.relationship === "none" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void sendFriendRequest()}
                      className="min-h-11 w-full rounded-xl border border-accent bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Add friend
                    </button>
                  ) : null}
                  {profile.relationship === "pending_outgoing" ? (
                    <div className="space-y-2">
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
                    <div className="flex gap-2">
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
                </div>

                {isAccepted ? (
                  <>
                    <section className="rounded-xl border border-border/60 bg-card-surface/50 p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setTasteOpen((v) => !v);
                          if (!tasteOpen && !taste) void loadTaste(profile.id);
                        }}
                        className="flex w-full items-center justify-between text-left text-sm font-semibold text-foreground"
                      >
                        Compare taste with you
                        <span className="text-foreground-muted">{tasteOpen ? "−" : "+"}</span>
                      </button>
                      {tasteOpen ? (
                        <div className="mt-2 text-xs text-foreground-muted">
                          {taste === "loading" ? (
                            <p>Loading taste…</p>
                          ) : taste?.comparison ? (
                            <div className="space-y-1">
                              {taste.comparison.sharedGenres.length > 0 ? (
                                <p>
                                  <span className="font-semibold text-foreground">Shared genres:</span>{" "}
                                  {taste.comparison.sharedGenres.join(", ")}
                                </p>
                              ) : null}
                              {taste.comparison.sharedLikedTitles.length > 0 ? (
                                <p>
                                  <span className="font-semibold text-foreground">Both liked:</span>{" "}
                                  {taste.comparison.sharedLikedTitles.join(" · ")}
                                </p>
                              ) : null}
                              {!taste.comparison.sharedGenres.length &&
                              !taste.comparison.sharedLikedTitles.length ? (
                                <p>No overlap yet — finish and rate a few books to compare.</p>
                              ) : null}
                            </div>
                          ) : (
                            <p>Could not load taste comparison.</p>
                          )}
                        </div>
                      ) : null}
                    </section>

                    {insights === "loading" ? (
                      <p className="text-sm text-foreground-muted">Loading library and insights…</p>
                    ) : insights ? (
                      <FriendProfileInsights summary={insights} />
                    ) : (
                      <p className="text-sm text-foreground-muted">Could not load their reading profile.</p>
                    )}
                  </>
                ) : null}

                {error ? <p className="text-xs text-red-700">{error}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </dialog>
  );
}
