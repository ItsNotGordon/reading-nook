"use client";

import Link from "next/link";
import { useState } from "react";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

type MagicLinkAuthFormProps = {
  redirectPath?: string;
  compact?: boolean;
  showFullPageLink?: boolean;
  authError?: string | null;
};

export function MagicLinkAuthForm({
  redirectPath = "/profile",
  compact = false,
  showFullPageLink = false,
  authError = null,
}: MagicLinkAuthFormProps) {
  const { signInWithEmail, signInWithGoogle } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(authError);
  const [busy, setBusy] = useState(false);

  function handleGoogleSignIn() {
    setBusy(true);
    setMessage(null);
    void signInWithGoogle(redirectPath).then((result) => {
      if (!result.ok) {
        setMessage(result.message);
        setBusy(false);
      }
    });
  }

  const isErrorMessage = Boolean(authError && message === authError);

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {!compact ? (
        <div>
          <p className="font-serif text-xl font-semibold text-foreground">
            Sign in or create an account
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            Continue with Google for the fastest sign-in, or use a magic link by email. Use the same
            account on phone and laptop to sync your library.
          </p>
        </div>
      ) : (
        <p className="text-sm text-foreground-muted">
          Your books are on <span className="font-medium text-foreground">this device only</span>{" "}
          until you sign in. Google or email — same account on every device.
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={handleGoogleSignIn}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40 disabled:opacity-60"
      >
        <GoogleIcon />
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wider text-foreground-muted">or</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

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

      {message ? (
        <p className={`text-xs ${isErrorMessage ? "text-red-700" : "text-foreground-muted"}`}>
          {message}
        </p>
      ) : null}

      {showFullPageLink ? (
        <p className="text-xs text-foreground-muted">
          <Link
            href={`/login?next=${encodeURIComponent(redirectPath)}`}
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            Open full sign-in page
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
