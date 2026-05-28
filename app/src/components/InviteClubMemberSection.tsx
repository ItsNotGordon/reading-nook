"use client";

import { useEffect, useMemo, useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useNotificationCounts } from "@/components/NotificationCountsProvider";
import { inviteClubMember } from "@/lib/clubClient";
import { normalizeUsername } from "@/lib/username";

type SearchUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type InviteClubMemberSectionProps = {
  clubId: string;
  existingMemberIds: string[];
  pendingInviteUserIds?: string[];
  currentUserId: string | null;
  onInvited: () => void;
};

export function InviteClubMemberSection({
  clubId,
  existingMemberIds,
  pendingInviteUserIds = [],
  currentUserId,
  onInvited,
}: InviteClubMemberSectionProps) {
  const { refresh: refreshNotificationCounts } = useNotificationCounts();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const excludedIds = useMemo(
    () => new Set([...existingMemberIds, ...pendingInviteUserIds]),
    [existingMemberIds, pendingInviteUserIds],
  );
  const searchTerm = normalizeUsername(searchQuery);
  const canSearch = searchTerm.length >= 2;

  useEffect(() => {
    if (!canSearch) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearchBusy(true);
      void fetch(`/api/users/search?q=${encodeURIComponent(searchTerm)}`)
        .then((res) => res.json())
        .then((data: { users?: SearchUser[] }) => {
          const users = (data.users ?? []).filter(
            (u) => !excludedIds.has(u.id) && u.id !== currentUserId,
          );
          setSearchResults(users);
        })
        .finally(() => setSearchBusy(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm, canSearch, excludedIds, currentUserId]);

  async function handleInvite(user: SearchUser) {
    if (invitingId) return;
    setInvitingId(user.id);
    setStatus(null);
    const result = await inviteClubMember(clubId, user.username);
    setInvitingId(null);
    if (result.ok) {
      setStatus(`Invitation sent to @${result.username ?? user.username}.`);
      setSearchQuery("");
      setSearchResults([]);
      onInvited();
      refreshNotificationCounts();
    } else {
      setStatus(result.error ?? "Could not invite member.");
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-background/80 p-3">
      <label htmlFor={`club-invite-search-${clubId}`} className="text-xs font-semibold text-foreground">
        Invite by username
      </label>
      <input
        id={`club-invite-search-${clubId}`}
        type="search"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setStatus(null);
        }}
        placeholder="Search @username"
        className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
        autoComplete="off"
      />
      {searchBusy ? <p className="mt-2 text-[10px] text-foreground-muted">Searching…</p> : null}
      {canSearch && !searchBusy && searchResults.length === 0 ? (
        <p className="mt-2 text-[10px] text-foreground-muted">No users found.</p>
      ) : null}
      {searchResults.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {searchResults.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-2 rounded-xl px-1 py-1"
            >
              <ProfileAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">@{u.username}</p>
                <p className="truncate text-[10px] text-foreground-muted">{u.displayName}</p>
              </div>
              <button
                type="button"
                disabled={invitingId === u.id}
                onClick={() => void handleInvite(u)}
                className="shrink-0 rounded-lg border border-accent bg-accent px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
              >
                {invitingId === u.id ? "…" : "Invite"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {status ? <p className="mt-2 text-[10px] text-foreground-muted">{status}</p> : null}
    </div>
  );
}
