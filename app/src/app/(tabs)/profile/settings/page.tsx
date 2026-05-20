"use client";

import Link from "next/link";
import { LibraryBackupSection } from "@/components/LibraryBackupSection";
import { ProfileAccountSection } from "@/components/ProfileAccountSection";
import { ThemedPageShell } from "@/components/ThemedPageShell";

export default function ProfileSettingsPage() {
  return (
    <ThemedPageShell title="Settings">
      <Link
        href="/profile"
        className="-mt-1 text-sm font-medium text-accent underline-offset-2 hover:underline"
      >
        ← Back to Profile
      </Link>
      <div className="flex flex-col gap-4">
        <ProfileAccountSection />
        <LibraryBackupSection />
      </div>
    </ThemedPageShell>
  );
}
