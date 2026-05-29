"use client";

import { useContext } from "react";
import { SyncStatusContext } from "./SyncStatusProvider";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

const STATUS_LABEL: Record<string, string> = {
  idle: "Ready",
  syncing: "Syncing…",
  synced: "Synced",
  error: "Sync issue",
  offline: "Offline",
};

export function SyncStatusLine() {
  const { user, configured } = useSupabaseAuth();
  const sync = useContext(SyncStatusContext);

  if (!configured || !user || !sync) return null;

  const { status, statusMessage, lastSyncedLabel, pushNow } = sync;
  const tone =
    status === "error"
      ? "text-red-700"
      : status === "syncing"
        ? "text-foreground-muted"
        : "text-foreground-muted";

  return (
    <div className="mt-2 rounded-xl border border-border/80 bg-background/60 px-3 py-2 text-xs">
      <p className={tone}>
        <span className="font-semibold text-foreground">{STATUS_LABEL[status] ?? status}</span>
        {status === "synced" ? (
          <span className="text-foreground-muted"> · Last synced {lastSyncedLabel}</span>
        ) : null}
        {statusMessage ? (
          <span
            className={`block mt-1 ${status === "error" ? "text-red-700" : "text-foreground-muted"}`}
          >
            {statusMessage}
          </span>
        ) : null}
      </p>
      {status === "error" ? (
        <button
          type="button"
          onClick={() => void pushNow()}
          className="mt-2 text-xs font-semibold text-accent underline-offset-2 hover:underline"
        >
          Retry sync
        </button>
      ) : null}
    </div>
  );
}
