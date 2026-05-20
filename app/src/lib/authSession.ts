/** Cookie read by middleware after sign-out to require login before using the app. */
export const REAUTH_COOKIE_NAME = "reading-nook-requires-reauth";
export const REAUTH_COOKIE_VALUE = "1";

const LAST_AUTH_USER_KEY = "reading-nook-last-auth-user-id";

export function setRequiresReauth(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${REAUTH_COOKIE_NAME}=${REAUTH_COOKIE_VALUE}; path=/; max-age=31536000; SameSite=Lax`;
}

export function clearRequiresReauth(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${REAUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function getRequiresReauth(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const [name, value] = part.trim().split("=");
    return name === REAUTH_COOKIE_NAME && value === REAUTH_COOKIE_VALUE;
  });
}

export function getLastAuthUserId(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(LAST_AUTH_USER_KEY);
}

export function setLastAuthUserId(userId: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(LAST_AUTH_USER_KEY, userId);
}

export function clearLastAuthUserId(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(LAST_AUTH_USER_KEY);
}

export function isAccountSwitch(userId: string): boolean {
  const last = getLastAuthUserId();
  return last !== null && last !== userId;
}
