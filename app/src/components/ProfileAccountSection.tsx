"use client";

import { useEffect, useState } from "react";
import { MagicLinkAuthForm } from "./MagicLinkAuthForm";
import { SyncStatusLine } from "./SyncStatusLine";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

export function ProfileAccountSection() {
  const { configured, loading, user, shareShelves, signOut, setShareShelves } = useSupabaseAuth();
  const [myUsername, setMyUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !user) return;
    let cancelled = false;
    void fetch("/api/profile/username")
      .then((res) => res.json())
      .then((data: { username?: string | null }) => {
        if (!cancelled) setMyUsername(data.username ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [configured, user]);

  if (!configured) {
    return (
      <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
        <p className="text-sm font-semibold text-foreground">Account</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          This deployment uses <span className="font-medium">local storage only</span> — your
          library lives on this browser until you add Supabase. Each phone or laptop keeps its own
          copy until then. See <span className="font-medium">docs/SUPABASE_SETUP.md</span> and{" "}
          <span className="font-medium">app/README.md</span>.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <p className="text-sm font-semibold text-foreground">Account</p>
      {loading ? (
        <p className="mt-2 text-sm text-foreground-muted">Checking session…</p>
      ) : user ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-foreground-muted">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>. Changes
            sync to the cloud after a short pause (~2 seconds).
          </p>
          {myUsername ? (
            <p className="text-sm text-foreground-muted">
              Username: <span className="font-semibold text-foreground">@{myUsername}</span>
            </p>
          ) : (
            <p className="text-sm text-amber-900/80">
              Set your @username in Edit profile to use Friends search.
            </p>
          )}
          <SyncStatusLine />
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={shareShelves}
              onChange={(e) => void setShareShelves(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              Share shelves with accepted friends
              <span className="mt-0.5 block text-xs text-foreground-muted">
                Friends only see titles on your shelves when this is on. Taste comparison works
                without sharing full shelves.
              </span>
            </span>
          </label>
          <p className="text-xs text-foreground-muted">
            Signing out clears your library from this browser. Your cloud copy stays tied to this
            account — sign in again to restore it.
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <MagicLinkAuthForm redirectPath="/profile" compact showFullPageLink />
        </div>
      )}
    </section>
  );
}
