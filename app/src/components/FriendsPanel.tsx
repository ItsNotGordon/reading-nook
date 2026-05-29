"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProfileAvatar } from "./ProfileAvatar";
import { useNotificationCounts } from "./NotificationCountsProvider";
import { useSupabaseAuth } from "./SupabaseAuthProvider";
import { normalizeUsername } from "@/lib/username";

type FriendRow = {
  friendshipId: string;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  tagline: string;
  status: "pending" | "friend";
  direction?: "incoming" | "outgoing";
};

type SearchUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  tagline: string;
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

export function FriendsPanel() {
  const router = useRouter();
  const { configured, loading, user } = useSupabaseAuth();
  const { refresh: refreshNotificationCounts } = useNotificationCounts();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [hasUsername, setHasUsername] = useState<boolean | null>(null);
  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const openProfile = useCallback(
    (username: string) => {
      router.push(`/friends/${encodeURIComponent(normalizeUsername(username))}`);
    },
    [router],
  );

  const loadUsername = useCallback(async () => {
    const res = await fetch("/api/profile/username");
    if (!res.ok) return;
    const data = (await res.json()) as { username?: string | null; hasUsername?: boolean };
    setHasUsername(Boolean(data.hasUsername));
    setMyUsername(data.username ?? null);
  }, []);

  const loadFriends = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (!res.ok) return;
    const data = (await res.json()) as { friends?: FriendRow[] };
    setFriends(data.friends ?? []);
  }, []);

  useEffect(() => {
    if (!user) return;
    const frame = requestAnimationFrame(() => {
      void loadUsername();
      void loadFriends();
    });
    return () => cancelAnimationFrame(frame);
  }, [user, loadUsername, loadFriends]);

  const searchTerm = normalizeUsername(searchQuery);
  const canSearch = Boolean(user && hasUsername && searchTerm.length >= 2);
  const visibleSearchResults = canSearch ? searchResults : [];

  useEffect(() => {
    if (!canSearch) return;
    const timer = window.setTimeout(() => {
      setSearchBusy(true);
      void fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`)
        .then((res) => res.json())
        .then((data: { users?: SearchUser[] }) => setSearchResults(data.users ?? []))
        .finally(() => setSearchBusy(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, canSearch]);

  const pendingIncoming = friends.filter((f) => f.status === "pending" && f.direction === "incoming");
  const pendingOutgoing = friends.filter((f) => f.status === "pending" && f.direction === "outgoing");
  const mutualFriends = friends.filter((f) => f.status === "friend");

  if (!configured) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center shadow-inner">
        <p className="font-medium text-foreground">Friends need cloud accounts</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          Configure Supabase on this deployment to find friends by username. See{" "}
          <span className="font-medium">docs/SUPABASE_SETUP.md</span>.
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-foreground-muted">Loading account…</p>;
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center shadow-inner">
        <p className="font-medium text-foreground">Sign in to use Friends</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          Search by @username, view profiles, and send friend requests.
        </p>
        <Link
          href="/login?next=/friends"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-accent px-5 text-sm font-semibold text-white shadow-sm active:opacity-90"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (hasUsername === false) {
    return (
      <div className="rounded-2xl border border-border bg-card-surface/95 p-5 text-center shadow-sm">
        <p className="font-medium text-foreground">Choose your @username</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          Usernames are required so friends can find you. Set yours in Edit profile.
        </p>
        <Link
          href="/profile"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-accent px-5 text-sm font-semibold text-white shadow-sm"
        >
          Go to Profile
        </Link>
      </div>
    );
  }

  if (hasUsername === null) {
    return <p className="text-sm text-foreground-muted">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {myUsername ? (
        <p className="text-xs text-foreground-muted">
          You are <span className="font-semibold text-foreground">@{myUsername}</span>
        </p>
      ) : null}

      <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm">
        <label htmlFor="friend-search" className="text-sm font-semibold text-foreground">
          Search usernames
        </label>
        <input
          id="friend-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search @username"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          autoComplete="off"
        />
        {searchBusy ? <p className="mt-2 text-xs text-foreground-muted">Searching…</p> : null}
        {canSearch && !searchBusy && visibleSearchResults.length === 0 ? (
          <p className="mt-2 text-xs text-foreground-muted">No users found.</p>
        ) : null}
        {visibleSearchResults.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {visibleSearchResults.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => openProfile(u.username)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-accent-soft/25"
                >
                  <ProfileAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">@{u.username}</span>
                    <span className="block truncate text-xs text-foreground-muted">{u.displayName}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {status ? <p className="text-xs text-foreground-muted">{status}</p> : null}

      {pendingIncoming.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Incoming requests
          </p>
          <ul className="mt-2 space-y-2">
            {pendingIncoming.map((f) => (
              <li
                key={f.friendshipId}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border/80 bg-background px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => f.username && openProfile(f.username)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <ProfileAvatar name={f.displayName} avatarUrl={f.avatarUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">
                      {f.username ? `@${f.username}` : f.displayName}
                    </span>
                    {f.tagline ? (
                      <span className="block truncate text-xs text-foreground-muted">{f.tagline}</span>
                    ) : null}
                  </span>
                </button>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      void patchFriendship(f.friendshipId, "accept")
                        .then(() => {
                          loadFriends();
                          refreshNotificationCounts();
                        })
                        .catch((err: Error) => setStatus(err.message))
                    }
                    className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void patchFriendship(f.friendshipId, "decline")
                        .then(() => {
                          loadFriends();
                          refreshNotificationCounts();
                        })
                        .catch((err: Error) => setStatus(err.message))
                    }
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pendingOutgoing.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Sent requests
          </p>
          <ul className="mt-2 space-y-2">
            {pendingOutgoing.map((f) => (
              <li
                key={f.friendshipId}
                className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-border/80 bg-card-surface/50 px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => f.username && openProfile(f.username)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <ProfileAvatar name={f.displayName} avatarUrl={f.avatarUrl} size="sm" />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">
                      {f.username ? `@${f.username}` : f.displayName}
                    </span>
                    {f.tagline ? (
                      <span className="block truncate text-xs text-foreground-muted">{f.tagline}</span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void patchFriendship(f.friendshipId, "cancel")
                      .then(() => {
                        loadFriends();
                        refreshNotificationCounts();
                      })
                      .catch((err: Error) => setStatus(err.message))
                  }
                  className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mutualFriends.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">Friends</p>
          <ul className="mt-2 space-y-3">
            {mutualFriends.map((f) => (
                <li
                  key={f.friendshipId}
                  className="rounded-2xl border border-border/80 bg-background px-4 py-3 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => f.username && openProfile(f.username)}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <ProfileAvatar name={f.displayName} avatarUrl={f.avatarUrl} size="sm" />
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">
                        {f.username ? `@${f.username}` : f.displayName}
                      </span>
                      {f.tagline ? (
                        <span className="block truncate text-xs text-foreground-muted">{f.tagline}</span>
                      ) : null}
                    </span>
                  </button>
                <p className="mt-2 text-xs text-foreground-muted">
                  Tap to view library, ratings, and insights
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : mutualFriends.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
        <p className="text-sm text-foreground-muted">No friends yet — search for someone above.</p>
      ) : null}

    </div>
  );
}
