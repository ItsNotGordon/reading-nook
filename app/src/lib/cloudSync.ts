import type { AppState } from "./types";
import { SENTIMENT_BUCKETS } from "./types";
import { countShelvedBooks } from "./tasteComparison";

export const STALE_REFRESH_MESSAGE =
  "Your library was updated on another device. Refreshed from cloud.";

export type SyncPullResult =
  | { kind: "empty" }
  | { kind: "cloud"; state: AppState; updatedAt: string }
  | { kind: "error"; message: string };

export type PushCloudResult =
  | { ok: true; updatedAt: string }
  | { ok: false; stale: true; state: AppState; updatedAt: string }
  | { ok: false; error: string };

export type InitialSyncDecision =
  | { action: "noop" }
  | { action: "push" }
  | { action: "hydrate" }
  | { action: "conflict"; localCount: number; cloudCount: number };

/** True when server has a library row the client has not caught up to. */
export function isStaleServerRevision(
  lastKnownUpdatedAt: string | null | undefined,
  serverUpdatedAt: string | null | undefined,
  serverHasLibraryRow: boolean,
): boolean {
  if (!serverHasLibraryRow || !serverUpdatedAt) return false;
  if (!lastKnownUpdatedAt) return true;
  return lastKnownUpdatedAt !== serverUpdatedAt;
}

export function libraryFingerprint(state: AppState): string {
  const parts: string[] = [];
  const ids = Object.keys(state.userBooks).sort();
  for (const id of ids) {
    const ub = state.userBooks[id];
    if (!ub) continue;
    parts.push(
      `${id}:${ub.shelf}:${ub.sentimentBucket ?? ""}:${ub.derivedScore ?? ""}:${ub.currentPage}`,
    );
  }
  for (const bucket of SENTIMENT_BUCKETS) {
    parts.push(`${bucket}:${state.bucketRankings[bucket].join(",")}`);
  }
  return parts.join("|");
}

export function librariesDiffer(a: AppState, b: AppState): boolean {
  return libraryFingerprint(a) !== libraryFingerprint(b);
}

export function decideInitialSync(
  local: AppState,
  cloud: AppState | null,
  _cloudUpdatedAt: string | null,
  options?: { preventAutoPush?: boolean },
): InitialSyncDecision {
  const localCount = countShelvedBooks(local);
  const cloudCount = cloud ? countShelvedBooks(cloud) : 0;

  if (cloudCount === 0) {
    if (localCount === 0) return { action: "noop" };
    if (options?.preventAutoPush) {
      return { action: "conflict", localCount, cloudCount: 0 };
    }
    return { action: "push" };
  }

  if (localCount === 0) return { action: "hydrate" };

  if (librariesDiffer(local, cloud!)) {
    return { action: "conflict", localCount, cloudCount };
  }

  return { action: "hydrate" };
}

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

export async function pushCloudLibrary(
  state: AppState,
  lastKnownUpdatedAt: string | null,
): Promise<PushCloudResult> {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, lastKnownUpdatedAt }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      updatedAt?: string;
      state?: AppState;
      error?: string;
      stale?: boolean;
    };

    if (res.status === 409 && data.state && data.updatedAt) {
      return { ok: false, stale: true, state: data.state, updatedAt: data.updatedAt };
    }

    if (!res.ok) {
      return { ok: false, error: data.error ?? `Upload failed (${res.status})` };
    }

    return { ok: true, updatedAt: data.updatedAt ?? new Date().toISOString() };
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
