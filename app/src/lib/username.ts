export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function validateUsername(raw: string): { ok: true; username: string } | { ok: false; error: string } {
  const username = normalizeUsername(raw);
  if (!username) {
    return { ok: false, error: "Username is required." };
  }
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return {
      ok: false,
      error: `Use ${USERNAME_MIN}–${USERNAME_MAX} characters: lowercase letters, numbers, underscore.`,
    };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: `Use ${USERNAME_MIN}–${USERNAME_MAX} characters: lowercase letters, numbers, underscore.`,
    };
  }
  return { ok: true, username };
}
