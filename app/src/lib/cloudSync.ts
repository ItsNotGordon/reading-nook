import type { AppState } from "./types";

export type SyncPullResult =
  | { kind: "empty" }
  | { kind: "cloud"; state: AppState; updatedAt: string }
  | { kind: "error"; message: string };

export async function fetchCloudLibrary(): Promise<SyncPullResult> {
  try {
    const res = await fetch("/api/sync", { cache: "no-store" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { kind: "error", message: data.error ?? `Sync failed (${res.status})` };
    }
    const data = (await res.json()) as { state?: AppState | null; updatedAt?: string | null };
    if (!data.state) return { kind: "empty" };
    return {
      kind: "cloud",
      state: data.state,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return { kind: "error", message: "Could not reach the server." };
  }
}

export async function pushCloudLibrary(state: AppState): Promise<{ ok: boolean; updatedAt?: string; error?: string }> {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      updatedAt?: string;
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `Upload failed (${res.status})` };
    }
    return { ok: true, updatedAt: data.updatedAt };
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

export function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
