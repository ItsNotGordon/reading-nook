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
  return data.club ?? null;
}

export async function updateClub(
  clubId: string,
  updates: {
    name?: string;
    description?: string;
    isPublic?: boolean;
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
