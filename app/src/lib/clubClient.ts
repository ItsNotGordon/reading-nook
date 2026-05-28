import type { FeedItem } from "./feedClient";

export type ClubBook = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
};

export type Club = {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  isPublic: boolean;
  membersCanInvite: boolean;
  inviteCode: string;
  currentBook: ClubBook | null;
  memberCount: number;
  role: "admin" | "member" | null;
  createdAt: string;
};

export type ClubMember = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role: "admin" | "member";
};

export type ClubDetail = Club & {
  members: ClubMember[];
  pendingInviteUserIds: string[];
};

export type ClubInvite = {
  inviteId: string;
  clubId: string;
  clubName: string;
  inviterDisplayName: string;
  inviterUsername: string | null;
  inviterAvatarUrl: string | null;
  createdAt: string;
};

export async function fetchMyClubs(): Promise<Club[]> {
  const res = await fetch("/api/clubs", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.clubs) ? data.clubs : [];
}

export async function createClub(input: {
  name: string;
  description?: string;
  isPublic?: boolean;
  currentBook?: ClubBook;
}): Promise<{ ok: boolean; clubId?: string }> {
  const res = await fetch("/api/clubs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return { ok: false };
  const data = await res.json();
  return { ok: true, clubId: data.clubId };
}

export async function fetchClubDetail(clubId: string): Promise<ClubDetail | null> {
  const res = await fetch(`/api/clubs/${clubId}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  const club = data.club;
  if (!club) return null;
  return {
    ...club,
    pendingInviteUserIds: Array.isArray(club.pendingInviteUserIds)
      ? club.pendingInviteUserIds
      : [],
  };
}

export async function fetchClubInvites(): Promise<ClubInvite[]> {
  const res = await fetch("/api/clubs/invites", { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.invites) ? data.invites : [];
}

export async function respondToClubInvite(
  inviteId: string,
  action: "accept" | "decline",
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/clubs/invites/${inviteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Request failed." };
  }
  return { ok: true };
}

export async function updateClub(
  clubId: string,
  updates: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    membersCanInvite?: boolean;
    currentBook?: ClubBook | null;
  },
): Promise<boolean> {
  const res = await fetch(`/api/clubs/${clubId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return res.ok;
}

export async function deleteClub(clubId: string): Promise<boolean> {
  const res = await fetch(`/api/clubs/${clubId}`, { method: "DELETE" });
  return res.ok;
}

export async function joinClub(clubId: string, inviteCode?: string): Promise<boolean> {
  const res = await fetch(`/api/clubs/${clubId}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode }),
  });
  return res.ok;
}

export async function inviteClubMember(
  clubId: string,
  username: string,
): Promise<{ ok: boolean; error?: string; username?: string }> {
  const res = await fetch(`/api/clubs/${clubId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    username?: string;
  };
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Could not invite member." };
  }
  return { ok: true, username: data.username };
}

export async function leaveClub(clubId: string): Promise<boolean> {
  const res = await fetch(`/api/clubs/${clubId}/leave`, { method: "DELETE" });
  return res.ok;
}

export async function fetchClubFeed(clubId: string): Promise<{ items: FeedItem[]; currentUserId: string | null }> {
  const res = await fetch(`/api/clubs/${clubId}/feed`, { cache: "no-store" });
  if (!res.ok) return { items: [], currentUserId: null };
  const data = await res.json();
  return {
    items: Array.isArray(data.items) ? data.items : [],
    currentUserId: typeof data.currentUserId === "string" ? data.currentUserId : null,
  };
}

export async function resolveInviteCode(code: string): Promise<{ clubId: string; name: string; memberCount: number } | null> {
  const res = await fetch(`/api/clubs/join/${encodeURIComponent(code)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data.club ?? null;
}
