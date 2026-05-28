export type NotificationSummary = {
  friends: number;
  clubs: number;
};

export async function fetchNotificationSummary(): Promise<NotificationSummary> {
  const res = await fetch("/api/notifications/summary", { cache: "no-store" });
  if (!res.ok) return { friends: 0, clubs: 0 };
  const data = (await res.json().catch(() => ({}))) as {
    friends?: unknown;
    clubs?: unknown;
  };
  return {
    friends: typeof data.friends === "number" ? data.friends : 0,
    clubs: typeof data.clubs === "number" ? data.clubs : 0,
  };
}

export async function markClubSeen(clubId: string): Promise<boolean> {
  const res = await fetch(`/api/clubs/${clubId}/seen`, { method: "POST" });
  return res.ok;
}
