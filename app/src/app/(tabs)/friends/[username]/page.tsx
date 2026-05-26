"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FriendProfileView } from "@/components/FriendProfileView";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { normalizeUsername } from "@/lib/username";

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const rawUsername = typeof params.username === "string" ? params.username : "";
  const normalized = normalizeUsername(rawUsername);
  const [checkedSelf, setCheckedSelf] = useState(false);

  const checkSelf = useCallback(async () => {
    if (!user || !normalized) { setCheckedSelf(true); return; }
    try {
      const res = await fetch("/api/profile/username");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.username === "string" && data.username === normalized) {
          router.replace("/profile");
          return;
        }
      }
    } catch { /* proceed normally */ }
    setCheckedSelf(true);
  }, [user, normalized, router]);

  useEffect(() => { checkSelf(); }, [checkSelf]);

  useEffect(() => {
    if (!rawUsername) return;
    if (normalized && normalized !== rawUsername) {
      router.replace(`/friends/${encodeURIComponent(normalized)}`);
    }
  }, [rawUsername, normalized, router]);

  if (!normalized) {
    return (
      <ThemedPageShell>
        <Link
          href="/friends"
          className="text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          ← Back to Friends
        </Link>
        <p className="mt-4 text-sm text-foreground-muted">Invalid username.</p>
      </ThemedPageShell>
    );
  }

  if (!checkedSelf) {
    return <ThemedPageShell><div /></ThemedPageShell>;
  }

  return (
    <ThemedPageShell>
      <Link
        href="/friends"
        className="-mt-1 text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        ← Back to Friends
      </Link>
      <FriendProfileView username={normalized} />
    </ThemedPageShell>
  );
}
