"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MagicLinkAuthForm } from "@/components/MagicLinkAuthForm";
import { PageShell } from "@/components/PageShell";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { getRequiresReauth } from "@/lib/authSession";

type LoginPageClientProps = {
  nextPath: string;
  authError?: string | null;
};

export function LoginPageClient({ nextPath, authError = null }: LoginPageClientProps) {
  const router = useRouter();
  const { configured, loading, user } = useSupabaseAuth();
  const [requiresReauth] = useState(() =>
    typeof window !== "undefined" ? getRequiresReauth() : false,
  );

  useEffect(() => {
    if (loading || !user) return;
    router.replace(nextPath);
  }, [loading, user, nextPath, router]);

  if (!configured) {
    return (
      <PageShell title="Sign in">
        <section className="rounded-2xl border border-border bg-card-surface/95 p-5 shadow-sm">
          <p className="text-sm leading-relaxed text-foreground-muted">
            Cloud sign-in is not configured on this deployment. Your library stays on this device
            only. See <span className="font-medium">docs/SUPABASE_SETUP.md</span> to enable accounts
            and sync.
          </p>
          <Link
            href="/library"
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm"
          >
            Continue to Library
          </Link>
        </section>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="Sign in">
        <p className="text-sm text-foreground-muted">Checking session…</p>
      </PageShell>
    );
  }

  if (user) {
    return (
      <PageShell title="Sign in">
        <p className="text-sm text-foreground-muted">Already signed in. Redirecting…</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Sign in">
      <section className="rounded-2xl border border-border bg-card-surface/95 p-5 shadow-sm ring-1 ring-black/[0.03]">
        {requiresReauth ? (
          <p className="mb-4 text-sm text-foreground-muted">
            Sign in to continue using Reading Nook on this device. Your previous session was
            signed out and local library data was cleared from this browser.
          </p>
        ) : null}
        <MagicLinkAuthForm redirectPath={nextPath} authError={authError} />
      </section>
      {!requiresReauth ? (
        <p className="mt-6 text-center text-sm text-foreground-muted">
          <Link
            href="/library"
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            Continue without signing in
          </Link>
          <span className="mt-1 block text-xs">Your library stays on this device until you sign in.</span>
        </p>
      ) : null}
    </PageShell>
  );
}
