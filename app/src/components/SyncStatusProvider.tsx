"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useReadingNook } from "@/lib/app-state";
import {
  fetchCloudLibrary,
  formatSyncTime,
  isServerCloudNewer,
  librariesDiffer,
  pushCloudLibrary,
  REFRESH_CHECKING_MESSAGE,
  REFRESH_HYDRATED_MESSAGE,
  REFRESH_UP_TO_DATE_MESSAGE,
  RESUME_REFRESH_THROTTLE_MS,
  STALE_REFRESH_MESSAGE,
  type CloudRefreshOutcome,
} from "@/lib/cloudSync";
import {
  isRevisionNewer,
  loadLastServerUpdatedAt,
  loadLocalRevision,
  saveLastServerUpdatedAt,
} from "@/lib/storage";
import { countShelvedBooks } from "@/lib/tasteComparison";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

export type SyncStatus = "offline" | "idle" | "syncing" | "synced" | "error";

type RefreshFromCloudOptions = {
  reason?: string;
  /** Bypass resume throttle (Settings manual refresh). */
  force?: boolean;
  /** Allow first-login push when cloud is empty (initial mount only). */
  allowLocalMigration?: boolean;
  /** Allow pushing local when newer than cloud (initial mount only). */
  allowLocalPushIfNewer?: boolean;
  revisionAtPullStart?: string | null;
};

type SyncStatusContextValue = {
  status: SyncStatus;
  statusMessage: string | null;
  lastSyncedAt: string | null;
  lastSyncedLabel: string;
  pushNow: () => Promise<void>;
  refreshFromCloud: (options?: RefreshFromCloudOptions) => Promise<CloudRefreshOutcome>;
};

export const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

const PUSH_DEBOUNCE_MS = 500;

/** Stale localStorage while server timestamp unchanged — safe to re-hydrate if no pending local edits. */
function shouldRehydrateStaleLocalCache(
  lastKnownUpdatedAt: string | null,
  serverUpdatedAt: string,
  localRevision: string | null,
  localState: Parameters<typeof librariesDiffer>[0],
  serverState: Parameters<typeof librariesDiffer>[1],
): boolean {
  if (isRevisionNewer(localRevision, lastKnownUpdatedAt)) return false;
  return librariesDiffer(localState, serverState);
}

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const { state, actions } = useReadingNook();
  const { user, configured } = useSupabaseAuth();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const stateRef = useRef(state);
  const pulledForUser = useRef<string | null>(null);
  const readyToPush = useRef(false);
  const lastServerUpdatedAtRef = useRef<string | null>(null);
  const lastResumeRefreshAtRef = useRef(0);
  const refreshInFlightRef = useRef<Promise<CloudRefreshOutcome> | null>(null);
  const skipNextDebouncedPushRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const rememberServerUpdatedAt = useCallback((userId: string, updatedAt: string | null) => {
    lastServerUpdatedAtRef.current = updatedAt;
    saveLastServerUpdatedAt(userId, updatedAt);
  }, []);

  const applyServerHydrate = useCallback(
    (
      userId: string,
      serverState: Parameters<typeof actions.hydrateLibrary>[0],
      updatedAt: string,
      message: string | null,
    ) => {
      skipNextDebouncedPushRef.current = true;
      rememberServerUpdatedAt(userId, updatedAt);
      actions.hydrateLibrary(serverState);
      setStatus("synced");
      setLastSyncedAt(updatedAt);
      if (message) setStatusMessage(message);
    },
    [actions, rememberServerUpdatedAt],
  );

  const handlePushResult = useCallback(
    (userId: string, result: Awaited<ReturnType<typeof pushCloudLibrary>>): CloudRefreshOutcome => {
      if (result.ok) {
        rememberServerUpdatedAt(userId, result.updatedAt);
        setStatus("synced");
        setLastSyncedAt(result.updatedAt);
        setStatusMessage(null);
        return { outcome: "pushed_migration", updatedAt: result.updatedAt };
      }
      if (!result.ok && "stale" in result) {
        applyServerHydrate(userId, result.state, result.updatedAt, STALE_REFRESH_MESSAGE);
        return { outcome: "hydrated", updatedAt: result.updatedAt };
      }
      setStatus("error");
      const msg = !result.ok ? result.error : "Sync failed.";
      setStatusMessage(msg);
      return { outcome: "error", message: msg };
    },
    [applyServerHydrate, rememberServerUpdatedAt],
  );

  const refreshFromCloud = useCallback(
    async (options: RefreshFromCloudOptions = {}): Promise<CloudRefreshOutcome> => {
      if (!user) {
        return { outcome: "error", message: "Sign in required." };
      }

      const {
        force = false,
        allowLocalMigration = false,
        allowLocalPushIfNewer = false,
        revisionAtPullStart = null,
      } = options;

      const now = Date.now();
      if (
        !force &&
        lastResumeRefreshAtRef.current > 0 &&
        now - lastResumeRefreshAtRef.current < RESUME_REFRESH_THROTTLE_MS
      ) {
        return { outcome: "throttled" };
      }

      if (refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }

      const run = async (): Promise<CloudRefreshOutcome> => {
        setStatus("syncing");
        if (force) setStatusMessage(REFRESH_CHECKING_MESSAGE);

        const userId = user.id;
        const lastKnown =
          lastServerUpdatedAtRef.current ?? loadLastServerUpdatedAt(userId);
        const localNow = stateRef.current;
        const localRevision = loadLocalRevision();
        const pull = await fetchCloudLibrary();

        if (pull.kind === "error") {
          setStatus("error");
          setStatusMessage(pull.message);
          return { outcome: "error", message: pull.message };
        }

        if (pull.kind === "empty") {
          const localCount = countShelvedBooks(localNow);
          if (allowLocalMigration && localCount > 0) {
            const result = await pushCloudLibrary(localNow, null);
            return handlePushResult(userId, result);
          }
          rememberServerUpdatedAt(userId, null);
          setStatus("synced");
          setLastSyncedAt(new Date().toISOString());
          if (force) setStatusMessage(REFRESH_UP_TO_DATE_MESSAGE);
          else setStatusMessage(null);
          return { outcome: "up_to_date", updatedAt: null };
        }

        if (allowLocalPushIfNewer) {
          const localCount = countShelvedBooks(localNow);
          const editedDuringPull = isRevisionNewer(localRevision, revisionAtPullStart);
          const localIsNewer = isRevisionNewer(localRevision, pull.updatedAt);
          if (localCount > 0 && (editedDuringPull || localIsNewer)) {
            const result = await pushCloudLibrary(localNow, pull.updatedAt);
            return handlePushResult(userId, result);
          }
        }

        const serverNewer = isServerCloudNewer(pull.updatedAt, lastKnown);
        const staleLocalCache = shouldRehydrateStaleLocalCache(
          lastKnown,
          pull.updatedAt,
          localRevision,
          localNow,
          pull.state,
        );

        if (serverNewer || staleLocalCache) {
          const message = serverNewer
            ? force
              ? REFRESH_HYDRATED_MESSAGE
              : STALE_REFRESH_MESSAGE
            : force
              ? REFRESH_HYDRATED_MESSAGE
              : STALE_REFRESH_MESSAGE;
          applyServerHydrate(userId, pull.state, pull.updatedAt, message);
          return { outcome: "hydrated", updatedAt: pull.updatedAt };
        }

        rememberServerUpdatedAt(userId, pull.updatedAt);
        setStatus("synced");
        setLastSyncedAt(pull.updatedAt);
        if (force) setStatusMessage(REFRESH_UP_TO_DATE_MESSAGE);
        else setStatusMessage(null);
        return { outcome: "up_to_date", updatedAt: pull.updatedAt };
      };

      const promise = run().finally(() => {
        refreshInFlightRef.current = null;
        if (!force) lastResumeRefreshAtRef.current = Date.now();
      });
      refreshInFlightRef.current = promise;
      return promise;
    },
    [user, applyServerHydrate, handlePushResult, rememberServerUpdatedAt],
  );

  const runInitialPull = useCallback(
    async (userId: string) => {
      readyToPush.current = false;
      setStatusMessage(null);
      await refreshFromCloud({
        reason: "initial",
        force: true,
        allowLocalMigration: true,
        allowLocalPushIfNewer: true,
        revisionAtPullStart: loadLocalRevision(),
      });
      readyToPush.current = true;
    },
    [refreshFromCloud],
  );

  useEffect(() => {
    if (!configured || !user) {
      pulledForUser.current = null;
      readyToPush.current = false;
      lastServerUpdatedAtRef.current = null;
      const resetTimer = window.setTimeout(() => {
        setStatus("idle");
        setLastSyncedAt(null);
        setStatusMessage(null);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;
    lastServerUpdatedAtRef.current = loadLastServerUpdatedAt(user.id);
    const startTimer = window.setTimeout(() => {
      void runInitialPull(user.id);
    }, 0);
    return () => window.clearTimeout(startTimer);
  }, [configured, user, runInitialPull]);

  useEffect(() => {
    if (!configured || !user || !readyToPush.current) return;

    const onResume = () => {
      void refreshFromCloud({ reason: "resume" });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") onResume();
    };

    window.addEventListener("focus", onResume);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onResume);

    return () => {
      window.removeEventListener("focus", onResume);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onResume);
    };
  }, [configured, user, refreshFromCloud]);

  const pushNow = useCallback(async () => {
    if (!user) return;
    setStatus("syncing");
    setStatusMessage(null);
    const result = await pushCloudLibrary(
      stateRef.current,
      lastServerUpdatedAtRef.current ?? loadLastServerUpdatedAt(user.id),
    );
    handlePushResult(user.id, result);
  }, [user, handlePushResult]);

  useEffect(() => {
    if (!configured || !user || !readyToPush.current) return;
    if (skipNextDebouncedPushRef.current) {
      skipNextDebouncedPushRef.current = false;
      return;
    }
    if (refreshInFlightRef.current) return;

    setStatus("syncing");
    const timer = window.setTimeout(() => {
      if (refreshInFlightRef.current) return;
      const lastKnown =
        lastServerUpdatedAtRef.current ?? loadLastServerUpdatedAt(user.id);
      void pushCloudLibrary(stateRef.current, lastKnown).then((result) => {
        handlePushResult(user.id, result);
      });
    }, PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [configured, user, state, handlePushResult]);

  const value = useMemo(
    () => ({
      status,
      statusMessage,
      lastSyncedAt,
      lastSyncedLabel: formatSyncTime(lastSyncedAt),
      pushNow,
      refreshFromCloud,
    }),
    [status, statusMessage, lastSyncedAt, pushNow, refreshFromCloud],
  );

  return (
    <SyncStatusContext.Provider value={value}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextValue {
  const ctx = useContext(SyncStatusContext);
  if (!ctx) {
    throw new Error("useSyncStatus must be used within SyncStatusProvider");
  }
  return ctx;
}
