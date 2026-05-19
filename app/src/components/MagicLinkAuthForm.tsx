"use client";

import Link from "next/link";
import { useState } from "react";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

type MagicLinkAuthFormProps = {
  redirectPath?: string;
  compact?: boolean;
  showFullPageLink?: boolean;
};

export function MagicLinkAuthForm({
  redirectPath = "/profile",
  compact = false,
  showFullPageLink = false,
}: MagicLinkAuthFormProps) {
  const { signInWithEmail } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {!compact ? (
        <div>
          <p className="font-serif text-xl font-semibold text-foreground">
            Sign in or create an account
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            We&apos;ll email you a magic link — no password. Use the same email on phone and laptop
            to sync your library.
          </p>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">
          Your books are on <span className="font-medium text-foreground">this device only</span>{" "}
          until you sign in. Use the same email on phone and laptop to sync one library.
        </p>
      )}

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setMessage(null);
          void signInWithEmail(email, redirectPath).then((result) => {
            setMessage(result.message);
            setBusy(false);
          });
        }}
      >
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

      {message ? <p className="text-xs text-foreground-muted">{message}</p> : null}

      {showFullPageLink ? (
        <p className="text-xs text-foreground-muted">
          <Link href={`/login?next=${encodeURIComponent(redirectPath)}`} className="font-semibold text-accent underline-offset-2 hover:underline">
            Open full sign-in page
          </Link>
        </p>
      ) : null}
    </div>
  );
}
