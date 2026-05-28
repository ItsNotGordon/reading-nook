"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { ClubCard } from "@/components/ClubCard";
import { ClubInvitesPanel } from "@/components/ClubInvitesPanel";
import { JoinClubSheet } from "@/components/JoinClubSheet";
import { fetchMyClubs, type Club } from "@/lib/clubClient";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);

  const load = useCallback(() => {
    fetchMyClubs().then((data) => {
      setClubs(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ThemedPageShell title="Clubs">
      <div className="flex flex-col gap-4">
        {/* Action buttons */}
        <div className="flex gap-2">
          <Link
            href="/clubs/create"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:opacity-90"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
            </svg>
            Create Club
          </Link>
          <button
            onClick={() => setJoinOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-card-surface/95 px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm ring-1 ring-black/[0.03] active:bg-accent-soft/20"
          >
            <svg className="h-4 w-4 text-accent" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
            </svg>
            Join Club
          </button>
        </div>

        <ClubInvitesPanel onChanged={load} />

        {/* Your Clubs */}
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            Your Clubs
          </h2>
          {loading ? (
            <div className="py-6 text-center text-xs text-foreground-muted">
              Loading clubs...
            </div>
          ) : clubs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-6 text-center shadow-inner">
              <p className="font-medium text-foreground">No clubs yet</p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">
                Create a club or join one with an invite code to start reading together.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {clubs.map((club) => (
                <ClubCard key={club.id} club={club} />
              ))}
            </div>
          )}
        </section>
      </div>

      <JoinClubSheet
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={load}
      />
    </ThemedPageShell>
  );
}
