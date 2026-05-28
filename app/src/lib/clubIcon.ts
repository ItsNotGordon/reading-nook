import { getSupabaseUrl } from "@/lib/supabase/config";

export { validateAvatarFile, getCroppedImageBlob } from "@/lib/profileAvatar";

export const CLUB_ICON_BUCKET = "club-icons";
export const CLUB_ICON_FILENAME = "icon.webp";

export function clubIconStoragePath(clubId: string): string {
  return `${clubId}/${CLUB_ICON_FILENAME}`;
}

export function clubIconPublicUrl(clubId: string): string {
  const base = getSupabaseUrl().replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${CLUB_ICON_BUCKET}/${clubIconStoragePath(clubId)}`;
}

export function isOwnClubIconUrl(clubId: string, url: string | null | undefined): boolean {
  if (!url) return false;
  return url === clubIconPublicUrl(clubId) || url.endsWith(`/${clubIconStoragePath(clubId)}`);
}
