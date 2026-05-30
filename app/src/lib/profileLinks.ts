/** Shared profile routing for feed, likes, and social UI. */

export type ProfileLinkUser = {
  userId: string;
  displayName: string;
  username: string | null;
};

export function authorDisplayLabel(user: ProfileLinkUser): string {
  const name = user.displayName?.trim() || "Reader";
  return user.username ? `@${user.username}` : name;
}

/** `/profile` for self; `/friends/[username]` for others; null if no safe target. */
export function getProfileHref(
  user: ProfileLinkUser,
  currentUserId: string | null | undefined,
): string | null {
  if (currentUserId && user.userId === currentUserId) return "/profile";
  if (user.username) return `/friends/${encodeURIComponent(user.username)}`;
  return null;
}

export function profileLinkAriaLabel(user: ProfileLinkUser): string {
  const label = authorDisplayLabel(user);
  if (user.username) return `View ${label}'s profile`;
  return `View ${user.displayName?.trim() || "Reader"}'s profile`;
}
