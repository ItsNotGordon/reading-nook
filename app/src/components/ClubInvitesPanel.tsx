"use client";

import { useCallback, useEffect, useState } from "react";
import { ClubIcon } from "@/components/ClubIcon";
import { useNotificationCounts } from "@/components/NotificationCountsProvider";
import { fetchClubInvites, respondToClubInvite, type ClubInvite } from "@/lib/clubClient";

type ClubInvitesPanelProps = {
  onChanged?: () => void;
};

export function ClubInvitesPanel({ onChanged }: ClubInvitesPanelProps) {
  const { refresh: refreshNotificationCounts } = useNotificationCounts();
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    void fetchClubInvites().then((data) => {
      setInvites(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(invite: ClubInvite, action: "accept" | "decline") {
    if (busyId) return;
    setBusyId(invite.inviteId);
    setStatus(null);
    const result = await respondToClubInvite(invite.inviteId, action);
    setBusyId(null);
    if (result.ok) {
      load();
      refreshNotificationCounts();
      onChanged?.();
    } else {
      setStatus(result.error ?? "Something went wrong.");
    }
  }

  if (loading) return null;
  if (invites.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Club invitations
      </h2>
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li
            key={invite.inviteId}
            className="flex items-center justify-between gap-2 rounded-2xl border border-border/80 bg-background px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <ClubIcon
                name={invite.clubName}
                iconUrl={invite.clubIconUrl}
                size="sm"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {invite.clubName}
                </span>
                <span className="block truncate text-xs text-foreground-muted">
                  {invite.inviterUsername
                    ? `@${invite.inviterUsername} invited you`
                    : `${invite.inviterDisplayName} invited you`}
                </span>
              </span>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                disabled={busyId === invite.inviteId}
                onClick={() => void handleAction(invite, "accept")}
                className="rounded-lg border border-accent bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={busyId === invite.inviteId}
                onClick={() => void handleAction(invite, "decline")}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
      {status ? <p className="mt-2 text-xs text-foreground-muted">{status}</p> : null}
    </section>
  );
}
