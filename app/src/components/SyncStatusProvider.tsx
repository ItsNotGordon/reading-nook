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
  pushCloudLibrary,
  STALE_REFRESH_MESSAGE,
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

type SyncStatusContextValue = {
  status: SyncStatus;
  statusMessage: string | null;
  lastSyncedAt: string | null;
  lastSyncedLabel: string;
  pushNow: () => Promise<void>;
};

export const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

const PUSH_DEBOUNCE_MS = 500;

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

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const rememberServerUpdatedAt = useCallback((userId: string, updatedAt: string | null) => {
    lastServerUpdatedAtRef.current = updatedAt;
    saveLastServerUpdatedAt(userId, updatedAt);
  }, []);

  const applyStaleRefresh = useCallback(
    (userId: string, serverState: Parameters<typeof actions.hydrateLibrary>[0], updatedAt: string) => {
      rememberServerUpdatedAt(userId, updatedAt);
      actions.hydrateLibrary(serverState);
      setStatus("synced");
      setLastSyncedAt(updatedAt);
      setStatusMessage(STALE_REFRESH_MESSAGE);
    },
    [actions, rememberServerUpdatedAt],
  );

  const handlePushResult = useCallback(
    (userId: string, result: Awaited<ReturnType<typeof pushCloudLibrary>>) => {
      if (result.ok) {
        rememberServerUpdatedAt(userId, result.updatedAt);
        setStatus("synced");
        setLastSyncedAt(result.updatedAt);
        setStatusMessage(null);
        return;
      }
      if (!result.ok && "stale" in result) {
        applyStaleRefresh(userId, result.state, result.updatedAt);
        return;
      }
      setStatus("error");
      setStatusMessage(!result.ok ? result.error : "Sync failed.");
    },
    [applyStaleRefresh, rememberServerUpdatedAt],
  );

  const runInitialPull = useCallback(
    async (userId: string) => {
      setStatus("syncing");
      setStatusMessage(null);
      const revisionAtPullStart = loadLocalRevision();
      const pull = await fetchCloudLibrary();

      if (pull.kind === "error") {
        setStatus("error");
        setStatusMessage(pull.message);
        readyToPush.current = true;
        return;
      }

      if (pull.kind === "cloud") {
        rememberServerUpdatedAt(userId, pull.updatedAt);
        const localNow = stateRef.current;
        const localCount = countShelvedBooks(localNow);
        const localRevision = loadLocalRevision();
        const editedDuringPull = isRevisionNewer(localRevision, revisionAtPullStart);
        const localIsNewer = isRevisionNewer(localRevision, pull.updatedAt);

        if (localCount > 0 && (editedDuringPull || localIsNewer)) {
          const result = await pushCloudLibrary(localNow, pull.updatedAt);
          handlePushResult(userId, result);
          readyToPush.current = true;
          return;
        }

        actions.hydrateLibrary(pull.state);
        setStatus("synced");
        setLastSyncedAt(pull.updatedAt);
        readyToPush.current = true;
        return;
      }

      // Cloud is empty — push local data if any (first-login migration).
      const localCount = countShelvedBooks(stateRef.current);
      if (localCount > 0) {
        const result = await pushCloudLibrary(stateRef.current, null);
        handlePushResult(userId, result);
      } else {
        rememberServerUpdatedAt(userId, null);
        setStatus("synced");
        setLastSyncedAt(new Date().toISOString());
      }
      readyToPush.current = true;
    },
    [actions, handlePushResult, rememberServerUpdatedAt],
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
    readyToPush.current = false;
    lastServerUpdatedAtRef.current = loadLastServerUpdatedAt(user.id);
    const startTimer = window.setTimeout(() => {
      void runInitialPull(user.id);
    }, 0);
    return () => window.clearTimeout(startTimer);
  }, [configured, user, runInitialPull]);

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
    setStatus("syncing");
    const timer = window.setTimeout(() => {
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
    }),
    [status, statusMessage, lastSyncedAt, pushNow],
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
