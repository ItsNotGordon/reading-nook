"use client";

import { ThemedPageShell } from "@/components/ThemedPageShell";

export default function ClubsPage() {
  return (
    <ThemedPageShell title="Clubs">
      <div className="flex flex-1 flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft/30">
          <svg className="h-8 w-8 text-accent" viewBox="0 0 24 24" fill="none">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" stroke="currentColor" strokeWidth="1.75" />
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.75" />
            <path d="M9 7h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </div>
        <p className="mt-4 text-sm font-semibold text-foreground">Coming soon</p>
        <p className="mt-1 text-xs text-foreground-muted">
          Clubs will be available in a future update.
        </p>
      </div>
    </ThemedPageShell>
  );
}
