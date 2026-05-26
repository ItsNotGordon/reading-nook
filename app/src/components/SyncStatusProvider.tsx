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
} from "@/lib/cloudSync";
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

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const runInitialPull = useCallback(
    async () => {
      setStatus("syncing");
      setStatusMessage(null);
      const pull = await fetchCloudLibrary();

      if (pull.kind === "error") {
        setStatus("error");
        setStatusMessage(pull.message);
        readyToPush.current = true;
        return;
      }

      if (pull.kind === "cloud") {
        actions.hydrateLibrary(pull.state);
        setStatus("synced");
        setLastSyncedAt(pull.updatedAt);
        readyToPush.current = true;
        return;
      }

      // Cloud is empty -- push local data if any
      const localCount = countShelvedBooks(stateRef.current);
      if (localCount > 0) {
        const result = await pushCloudLibrary(stateRef.current);
        if (result.ok) {
          setStatus("synced");
          setLastSyncedAt(result.updatedAt ?? new Date().toISOString());
        } else {
          setStatus("error");
          setStatusMessage(result.error ?? "Upload failed.");
        }
      } else {
        setStatus("synced");
        setLastSyncedAt(new Date().toISOString());
      }
      readyToPush.current = true;
    },
    [actions],
  );

  useEffect(() => {
    if (!configured || !user) {
      pulledForUser.current = null;
      readyToPush.current = false;
      const resetTimer = window.setTimeout(() => {
        setStatus("idle");
        setLastSyncedAt(null);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    if (pulledForUser.current === user.id) return;
    pulledForUser.current = user.id;
    readyToPush.current = false;
    const startTimer = window.setTimeout(() => {
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
    if (!configured || !user || !readyToPush.current) return;
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
    }, PUSH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [configured, user, state]);

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
