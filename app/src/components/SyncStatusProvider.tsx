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
import type { AppState } from "@/lib/types";
import { useReadingNook } from "@/lib/app-state";
import {
  decideInitialSync,
  fetchCloudLibrary,
  formatSyncTime,
  pushCloudLibrary,
  type SyncMergeDecision,
} from "@/lib/cloudSync";
import { useSupabaseAuth } from "./SupabaseAuthProvider";
import { SyncConflictSheet } from "./SyncConflictSheet";

export type SyncStatus = "offline" | "idle" | "syncing" | "synced" | "error";

type ConflictState = {
  local: AppState;
  cloud: AppState;
  localCount: number;
  cloudCount: number;
  cloudUpdatedAt: string;
};

type SyncStatusContextValue = {
  status: SyncStatus;
  statusMessage: string | null;
  lastSyncedAt: string | null;
  lastSyncedLabel: string;
  pushNow: () => Promise<void>;
};

export const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const { state, actions } = useReadingNook();
  const { user, configured } = useSupabaseAuth();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const stateRef = useRef(state);
  const pulledForUser = useRef<string | null>(null);
  const readyToPush = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyDecision = useCallback(
    async (decision: SyncMergeDecision) => {
      if (decision.action === "noop") {
        setStatus("synced");
        setLastSyncedAt(new Date().toISOString());
        readyToPush.current = true;
        return;
      }
      if (decision.action === "hydrate") {
        actions.hydrateLibrary(decision.cloud);
        setStatus("synced");
        setLastSyncedAt(new Date().toISOString());
        readyToPush.current = true;
        return;
      }
      if (decision.action === "push") {
        setStatus("syncing");
        const result = await pushCloudLibrary(decision.local);
        if (result.ok) {
          setStatus("synced");
          setLastSyncedAt(result.updatedAt ?? new Date().toISOString());
          setStatusMessage(null);
        } else {
          setStatus("error");
          setStatusMessage(result.error ?? "Upload failed.");
        }
        readyToPush.current = true;
        return;
      }
      setConflict({
        local: decision.local,
        cloud: decision.cloud,
        localCount: decision.localCount,
        cloudCount: decision.cloudCount,
        cloudUpdatedAt: decision.cloudUpdatedAt,
      });
      setStatus("idle");
      readyToPush.current = false;
    },
    [actions],
  );

  const runInitialPull = useCallback(async () => {
    setStatus("syncing");
    setStatusMessage(null);
    const pull = await fetchCloudLibrary();
    if (pull.kind === "error") {
      setStatus("error");
      setStatusMessage(pull.message);
      readyToPush.current = true;
      return;
    }
    const local = stateRef.current;
    if (pull.kind === "empty") {
      await applyDecision(decideInitialSync(local, null, null));
      return;
    }
    await applyDecision(decideInitialSync(local, pull.state, pull.updatedAt));
  }, [applyDecision]);

  useEffect(() => {
    if (!configured || !user) {
      pulledForUser.current = null;
      readyToPush.current = false;
      const resetTimer = window.setTimeout(() => {
        setConflict(null);
        setStatus("idle");
        setLastSyncedAt(null);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;
    readyToPush.current = false;
    const startTimer = window.setTimeout(() => {
      setConflict(null);
      void runInitialPull();
    }, 0);
    return () => window.clearTimeout(startTimer);
  }, [configured, user, runInitialPull]);

  const pushNow = useCallback(async () => {
    if (!user) return;
    setStatus("syncing");
    setStatusMessage(null);
    const result = await pushCloudLibrary(stateRef.current);
    if (result.ok) {
      setStatus("synced");
      setLastSyncedAt(result.updatedAt ?? new Date().toISOString());
    } else {
      setStatus("error");
      setStatusMessage(result.error ?? "Sync failed.");
    }
  }, [user]);

  useEffect(() => {
    if (!configured || !user || !readyToPush.current || conflict) return;
    setStatus("syncing");
    const timer = window.setTimeout(() => {
      void pushCloudLibrary(stateRef.current).then((result) => {
        if (result.ok) {
          setStatus("synced");
          setLastSyncedAt(result.updatedAt ?? new Date().toISOString());
          setStatusMessage(null);
        } else {
          setStatus("error");
          setStatusMessage(result.error ?? "Sync failed.");
        }
      });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [configured, user, state, conflict]);

  const resolveConflict = useCallback(
    async (choice: "local" | "cloud") => {
      if (!conflict) return;
      setConflict(null);
      if (choice === "cloud") {
        actions.hydrateLibrary(conflict.cloud);
        setStatus("synced");
        setLastSyncedAt(conflict.cloudUpdatedAt);
        readyToPush.current = true;
        return;
      }
      setStatus("syncing");
      const result = await pushCloudLibrary(conflict.local);
      if (result.ok) {
        setStatus("synced");
        setLastSyncedAt(result.updatedAt ?? new Date().toISOString());
        setStatusMessage(null);
      } else {
        setStatus("error");
        setStatusMessage(result.error ?? "Upload failed.");
      }
      readyToPush.current = true;
    },
    [actions, conflict],
  );

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
      {conflict ? (
        <SyncConflictSheet
          localCount={conflict.localCount}
          cloudCount={conflict.cloudCount}
          cloudUpdatedAt={conflict.cloudUpdatedAt}
          onChooseCloud={() => void resolveConflict("cloud")}
          onChooseLocal={() => void resolveConflict("local")}
        />
      ) : null}
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
