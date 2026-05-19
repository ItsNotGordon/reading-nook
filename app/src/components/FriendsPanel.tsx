"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FriendLibrarySheet } from "./FriendLibrarySheet";
import { useSupabaseAuth } from "./SupabaseAuthProvider";
import type { TasteComparison } from "@/lib/tasteComparison";

type FriendRow = {
  friendshipId: string;
  userId: string;
  displayName: string;
  tagline: string;
  shareShelves: boolean;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
};

type TasteResponse = {
  displayName: string;
  shareShelves: boolean;
  shelfCounts: { reading: number; finished: number; want: number } | null;
  comparison: TasteComparison | null;
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
  const { configured, loading, user } = useSupabaseAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tasteByFriend, setTasteByFriend] = useState<Record<string, TasteResponse | "loading">>({});
  const [shelfFriend, setShelfFriend] = useState<{ id: string; name: string } | null>(null);

  const loadFriends = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (!res.ok) return;
    const data = (await res.json()) as { friends?: FriendRow[] };
    setFriends(data.friends ?? []);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/friends");
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { friends?: FriendRow[] };
      if (!cancelled) setFriends(data.friends ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadTaste = useCallback(async (friendId: string) => {
    setTasteByFriend((prev) => ({ ...prev, [friendId]: "loading" }));
    const res = await fetch(`/api/friends/${friendId}/taste`);
    if (!res.ok) {
      setTasteByFriend((prev) => {
        const next = { ...prev };
        delete next[friendId];
        return next;
      });
      return;
    }
    const data = (await res.json()) as TasteResponse;
    setTasteByFriend((prev) => ({ ...prev, [friendId]: data }));
  }, []);

  const pendingIncoming = friends.filter((f) => f.status === "pending" && f.direction === "incoming");
  const pendingOutgoing = friends.filter((f) => f.status === "pending" && f.direction === "outgoing");
  const accepted = friends.filter((f) => f.status === "accepted");

  if (!configured) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center shadow-inner">
        <p className="font-medium text-foreground">Friends need cloud accounts</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          Configure Supabase on this deployment to invite friends and compare taste. Until then,
          your library stays private on this device. See{" "}
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
          Compare genres and liked titles with people you accept. There is no public feed — friends
          are opt-in.
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

  return (
    <div className="space-y-6">
      <p className="text-xs leading-relaxed text-foreground-muted">
        Friends are opt-in. They only see shelf details if you enable{" "}
        <span className="font-medium text-foreground">Share shelves</span> on Profile → Account.
      </p>

      <form
        className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setStatus(null);
          void fetch("/api/friends", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })
            .then(async (res) => {
              const data = (await res.json()) as { error?: string };
              if (!res.ok) {
                setStatus(data.error ?? "Could not send invite.");
                return;
              }
              setStatus("Friend request sent.");
              setEmail("");
              await loadFriends();
            })
            .finally(() => setBusy(false));
        }}
      >
        <p className="text-sm font-semibold text-foreground">Invite a friend</p>
        <p className="mt-1 text-xs text-foreground-muted">
          They must have signed in at least once on this app.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-xl border border-border bg-background px-4 text-sm font-semibold shadow-sm active:bg-accent-soft/40 disabled:opacity-60"
          >
            Invite
          </button>
        </div>
        {status ? <p className="mt-2 text-xs text-foreground-muted">{status}</p> : null}
      </form>

      {pendingIncoming.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Incoming invites
          </p>
          <ul className="mt-2 space-y-2">
            {pendingIncoming.map((f) => (
              <li
                key={f.friendshipId}
                className="flex items-center justify-between gap-2 rounded-2xl border border-border/80 bg-background px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{f.displayName}</p>
                  {f.tagline ? <p className="text-xs text-foreground-muted">{f.tagline}</p> : null}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      void patchFriendship(f.friendshipId, "accept")
                        .then(() => loadFriends())
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
                        .then(() => loadFriends())
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
            Sent invites
          </p>
          <ul className="mt-2 space-y-2">
            {pendingOutgoing.map((f) => (
              <li
                key={f.friendshipId}
                className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-border/80 bg-card-surface/50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{f.displayName}</p>
                  <p className="text-[11px] text-foreground-muted">Waiting for them to accept</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void patchFriendship(f.friendshipId, "cancel")
                      .then(() => loadFriends())
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

      {accepted.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
        <p className="text-sm text-foreground-muted">No friends yet — invite someone above.</p>
      ) : accepted.length > 0 ? (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Friends
          </p>
          <ul className="mt-2 space-y-3">
            {accepted.map((f) => {
              const taste = tasteByFriend[f.userId];
              return (
                <li
                  key={f.friendshipId}
                  className="rounded-2xl border border-border/80 bg-background px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{f.displayName}</p>
                      {f.tagline ? (
                        <p className="text-xs text-foreground-muted">{f.tagline}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-foreground-muted">
                        {f.shareShelves ? "Shares shelves with you" : "Shelves private"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void loadTaste(f.userId)}
                      className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
                    >
                      {taste ? "Refresh taste" : "Compare taste"}
                    </button>
                    {f.shareShelves ? (
                      <button
                        type="button"
                        onClick={() => setShelfFriend({ id: f.userId, name: f.displayName })}
                        className="text-xs font-semibold text-foreground underline-offset-2 hover:underline"
                      >
                        View shelves
                      </button>
                    ) : null}
                  </div>
                  {taste === "loading" ? (
                    <p className="mt-2 text-xs text-foreground-muted">Loading…</p>
                  ) : taste ? (
                    <div className="mt-2 space-y-2 rounded-xl border border-border/60 bg-card-surface/50 p-3 text-xs text-foreground-muted">
                      {!taste.shareShelves ? (
                        <p>They have not enabled shelf sharing.</p>
                      ) : (
                        <>
                          {taste.shelfCounts ? (
                            <p>
                              Their shelves: {taste.shelfCounts.reading} reading ·{" "}
                              {taste.shelfCounts.finished} finished · {taste.shelfCounts.want} want
                              to read
                            </p>
                          ) : null}
                          {taste.comparison ? (
                            <>
                              {taste.comparison.sharedGenres.length > 0 ? (
                                <p>
                                  <span className="font-semibold text-foreground">Shared genres:</span>{" "}
                                  {taste.comparison.sharedGenres.join(", ")}
                                </p>
                              ) : (
                                <p>No overlapping top genres yet.</p>
                              )}
                              {taste.comparison.sharedLikedTitles.length > 0 ? (
                                <p>
                                  <span className="font-semibold text-foreground">Both liked:</span>{" "}
                                  {taste.comparison.sharedLikedTitles.join(" · ")}
                                </p>
                              ) : (
                                <p>No overlapping liked picks yet.</p>
                              )}
                              <p className="text-[11px]">
                                You: {taste.comparison.yourFinishedCount} finished · Them:{" "}
                                {taste.comparison.friendFinishedCount} finished
                              </p>
                            </>
                          ) : (
                            <p>Sync your library to compare taste.</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {shelfFriend ? (
        <FriendLibrarySheet
          friendId={shelfFriend.id}
          friendName={shelfFriend.name}
          onClose={() => setShelfFriend(null)}
        />
      ) : null}
    </div>
  );
}
