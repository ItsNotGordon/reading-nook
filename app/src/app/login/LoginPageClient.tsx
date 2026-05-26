"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";

type LoginPageClientProps = {
  nextPath: string;
  authError?: string | null;
};

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

export function LoginPageClient({ nextPath, authError = null }: LoginPageClientProps) {
  const router = useRouter();
  const { configured, loading, user, signInWithGoogle } = useSupabaseAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(authError);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(nextPath);
  }, [loading, user, nextPath, router]);

  function handleGoogleSignIn() {
    setBusy(true);
    setMessage(null);
    void signInWithGoogle(nextPath).then((result) => {
      if (!result.ok) {
        setMessage(result.message);
        setBusy(false);
      }
    });
  }

  if (!configured) {
    return (
      <PageShell title="Sign in">
        <section className="rounded-2xl border border-border bg-card-surface/95 p-5 shadow-sm">
          <p className="text-sm leading-relaxed text-foreground-muted">
            Cloud sign-in is not configured on this deployment. See{" "}
            <span className="font-medium">docs/SUPABASE_SETUP.md</span> to enable accounts.
          </p>
        </section>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="Sign in">
        <p className="text-sm text-foreground-muted">Checking session...</p>
      </PageShell>
    );
  }

  if (user) {
    return (
      <PageShell title="Sign in">
        <p className="text-sm text-foreground-muted">Already signed in. Redirecting...</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Sign in">
      <section className="rounded-2xl border border-border bg-card-surface/95 p-5 shadow-sm ring-1 ring-black/[0.03]">
        <div className="space-y-4">
          <div>
            <p className="font-serif text-xl font-semibold text-foreground">
              Welcome to Reading Nook
            </p>
            <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
              Sign in with your Google account to track your reading, rate books, and connect with
              friends.
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleSignIn}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40 disabled:opacity-60"
          >
            <GoogleIcon />
            {busy ? "Redirecting..." : "Sign in with Google"}
          </button>

          {message ? (
            <p className="text-xs text-red-700">{message}</p>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
