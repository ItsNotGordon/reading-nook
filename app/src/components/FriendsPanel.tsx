"use client";

import { useCallback, useEffect, useState } from "react";
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

export function FriendsPanel() {
  const { configured, loading, user } = useSupabaseAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tasteByFriend, setTasteByFriend] = useState<Record<string, TasteResponse | "loading">>({});

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
  }, [user?.id]);

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

  if (!configured) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center shadow-inner">
        <p className="font-medium text-foreground">Friends need cloud accounts</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          Configure Supabase on this deployment to invite friends and compare taste. Until then,
          your library stays private on this device.
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-foreground-muted">Loading account…</p>;
  }

  const visibleFriends = user ? friends : [];

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center shadow-inner">
        <p className="font-medium text-foreground">Sign in to use Friends</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          Open Profile → Account and request a magic link. Friends can compare genres and liked
          titles when you both opt in to share shelves.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {visibleFriends.length === 0 ? (
        <p className="text-sm text-foreground-muted">No friends yet — invite someone above.</p>
      ) : (
        <ul className="space-y-3">
          {visibleFriends.map((f) => {
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
                      {f.status === "pending"
                        ? f.direction === "incoming"
                          ? "Wants to connect"
                          : "Invite pending"
                        : f.shareShelves
                          ? "Shares shelves"
                          : "Shelves private"}
                    </p>
                  </div>
                  {f.status === "pending" && f.direction === "incoming" ? (
                    <button
                      type="button"
                      onClick={() =>
                        void fetch("/api/friends", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            friendshipId: f.friendshipId,
                            action: "accept",
                          }),
                        }).then(() => loadFriends())
                      }
                      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
                    >
                      Accept
                    </button>
                  ) : null}
                </div>
                {f.status === "accepted" ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => void loadTaste(f.userId)}
                      className="text-xs font-semibold text-accent underline-offset-2 hover:underline"
                    >
                      {taste ? "Refresh taste comparison" : "Compare taste"}
                    </button>
                    {taste === "loading" ? (
                      <p className="mt-2 text-xs text-foreground-muted">Loading…</p>
                    ) : taste ? (
                      <div className="mt-2 space-y-1.5 text-xs text-foreground-muted">
                        {!taste.shareShelves ? (
                          <p>They have not enabled shelf sharing.</p>
                        ) : (
                          <>
                            {taste.shelfCounts ? (
                              <p>
                                Shelves: {taste.shelfCounts.reading} reading ·{" "}
                                {taste.shelfCounts.finished} finished · {taste.shelfCounts.want}{" "}
                                want to read
                              </p>
                            ) : null}
                            {taste.comparison ? (
                              <>
                                {taste.comparison.sharedGenres.length > 0 ? (
                                  <p>
                                    Shared genres:{" "}
                                    <span className="text-foreground">
                                      {taste.comparison.sharedGenres.join(", ")}
                                    </span>
                                  </p>
                                ) : null}
                                {taste.comparison.sharedLikedTitles.length > 0 ? (
                                  <p>
                                    Both liked:{" "}
                                    <span className="text-foreground">
                                      {taste.comparison.sharedLikedTitles.join(" · ")}
                                    </span>
                                  </p>
                                ) : (
                                  <p>No overlapping liked picks yet.</p>
                                )}
                              </>
                            ) : (
                              <p>Sync your library to compare taste.</p>
                            )}
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
