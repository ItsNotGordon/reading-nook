"use client";

import { useState } from "react";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

export function ProfileAccountSection() {
  const {
    configured,
    loading,
    user,
    shareShelves,
    signInWithEmail,
    signOut,
    setShareShelves,
  } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
        <p className="text-sm font-semibold text-foreground">Account</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          This deployment uses local storage only. Add Supabase env vars to enable sign-in, cloud
          sync, and friends. See <span className="font-medium">app/README.md</span>.
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
            Signed in as <span className="font-medium text-foreground">{user.email}</span>. Your
            library syncs to the cloud when you make changes.
          </p>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={shareShelves}
              onChange={(e) => void setShareShelves(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Share shelves with accepted friends
          </label>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
          >
            Sign out
          </button>
        </div>
      ) : (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setMessage(null);
            void signInWithEmail(email).then((result) => {
              setMessage(result.message);
              setBusy(false);
            });
          }}
        >
          <p className="text-sm text-foreground-muted">
            Sign in with a magic link to sync your library across devices and use Friends.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40 disabled:opacity-60"
          >
            {busy ? "Sending link…" : "Email me a sign-in link"}
          </button>
        </form>
      )}
      {message ? <p className="mt-2 text-xs text-foreground-muted">{message}</p> : null}
    </section>
  );
}
