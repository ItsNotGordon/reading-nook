import type { AppState } from "./types";
import { SENTIMENT_BUCKETS } from "./types";
import { getInitialState } from "./storage";
import { countShelvedBooks } from "./tasteComparison";

/** Stable fingerprint for conflict detection (not cryptographic). */
export function libraryFingerprint(state: AppState): string {
  const parts: string[] = [];
  const bookIds = Object.keys(state.userBooks).sort();
  for (const id of bookIds) {
    const ub = state.userBooks[id as keyof typeof state.userBooks];
    if (!ub) continue;
    parts.push(`${id}:${ub.shelf}:${ub.sentimentBucket ?? ""}:${ub.currentPage ?? ""}`);
  }
  for (const bucket of SENTIMENT_BUCKETS) {
    parts.push(`${bucket}:${(state.bucketRankings[bucket] ?? []).join(",")}`);
  }
  parts.push(`profile:${state.profile.displayName}:${state.profile.tagline}:${state.profile.theme ?? "plant"}`);
  return parts.join("|");
}

export function librariesDiffer(local: AppState, cloud: AppState): boolean {
  return libraryFingerprint(local) !== libraryFingerprint(cloud);
}

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

export type SyncMergeDecision =
  | { action: "hydrate"; cloud: AppState }
  | { action: "push"; local: AppState }
  | { action: "noop" }
  | {
      action: "conflict";
      local: AppState;
      cloud: AppState;
      localCount: number;
      cloudCount: number;
      cloudUpdatedAt: string;
    };

export type DecideInitialSyncOptions = {
  /** When true, never upload local data without explicit user choice (account switch). */
  preventAutoPush?: boolean;
};

export function decideInitialSync(
  local: AppState,
  cloud: AppState | null,
  cloudUpdatedAt: string | null,
  options?: DecideInitialSyncOptions,
): SyncMergeDecision {
  const localCount = countShelvedBooks(local);
  const preventAutoPush = options?.preventAutoPush ?? false;

  if (!cloud) {
    if (localCount > 0) {
      if (preventAutoPush) {
        return {
          action: "conflict",
          local,
          cloud: getInitialState(),
          localCount,
          cloudCount: 0,
          cloudUpdatedAt: cloudUpdatedAt ?? new Date().toISOString(),
        };
      }
      return { action: "push", local };
    }
    return { action: "noop" };
  }

  const cloudCount = countShelvedBooks(cloud);
  if (localCount === 0 && cloudCount > 0) {
    return { action: "hydrate", cloud };
  }
  if (cloudCount === 0 && localCount > 0) {
    if (preventAutoPush) {
      return {
        action: "conflict",
        local,
        cloud,
        localCount,
        cloudCount,
        cloudUpdatedAt: cloudUpdatedAt ?? new Date().toISOString(),
      };
    }
    return { action: "push", local };
  }
  if (localCount === 0 && cloudCount === 0) {
    return { action: "noop" };
  }

  if (!librariesDiffer(local, cloud)) {
    return { action: "noop" };
  }

  return {
    action: "conflict",
    local,
    cloud,
    localCount,
    cloudCount,
    cloudUpdatedAt: cloudUpdatedAt ?? new Date().toISOString(),
  };
}

export function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
