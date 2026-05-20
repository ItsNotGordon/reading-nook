"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FriendProfileView } from "@/components/FriendProfileView";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { normalizeUsername } from "@/lib/username";

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawUsername = typeof params.username === "string" ? params.username : "";
  const normalized = normalizeUsername(rawUsername);
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
