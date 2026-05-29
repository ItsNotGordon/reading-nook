/**
 * Canonical public origin for OAuth redirects (optional).
 * Set NEXT_PUBLIC_SITE_URL on Vercel so it matches Supabase Auth → URL Configuration.
 */
export function getPublicSiteOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.origin;
  } catch {
    return null;
  }
}

/** Base URL for /auth/callback — prefers NEXT_PUBLIC_SITE_URL, then browser origin. */
export function resolveAuthCallbackOrigin(browserOrigin: string): string {
  return getPublicSiteOrigin() ?? browserOrigin;
}

export function buildAuthCallbackUrl(browserOrigin: string, nextPath: string): string {
  const base = resolveAuthCallbackOrigin(browserOrigin);
  const safePath =
    nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/profile";
  return `${base}/auth/callback?next=${encodeURIComponent(safePath)}`;
}
