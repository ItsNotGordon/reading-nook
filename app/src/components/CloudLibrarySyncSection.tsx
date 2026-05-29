"use client";

import { useContext, useState } from "react";
import {
  REFRESH_CHECKING_MESSAGE,
  REFRESH_HYDRATED_MESSAGE,
  REFRESH_UP_TO_DATE_MESSAGE,
} from "@/lib/cloudSync";
import { clearLocalLibraryCache, STORAGE_KEY } from "@/lib/storage";
import { SyncStatusContext } from "./SyncStatusProvider";
import { useSupabaseAuth } from "./SupabaseAuthProvider";

export function CloudLibrarySyncSection() {
  const sync = useContext(SyncStatusContext);
  const { user, configured } = useSupabaseAuth();
  const [busy, setBusy] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  if (!configured || !user || !sync) return null;

  async function handleRefreshFromCloud() {
    if (!sync) return;
    setBusy(true);
    setLocalMessage(REFRESH_CHECKING_MESSAGE);
    const result = await sync.refreshFromCloud({ force: true, reason: "settings" });
    setBusy(false);
    if (result.outcome === "hydrated") {
      setLocalMessage(REFRESH_HYDRATED_MESSAGE);
    } else if (result.outcome === "up_to_date" || result.outcome === "throttled") {
      setLocalMessage(REFRESH_UP_TO_DATE_MESSAGE);
    } else if (result.outcome === "error") {
      setLocalMessage("Could not refresh. Try again.");
    } else if (result.outcome === "pushed_migration") {
      setLocalMessage(REFRESH_HYDRATED_MESSAGE);
    }
  }

  function handleClearCacheAndReload() {
    if (!user) return;
    const ok = window.confirm(
      "Clear this device’s saved library cache and reload? Your cloud library on Supabase is not deleted.",
    );
    if (!ok) return;
    clearLocalLibraryCache(user.id);
    window.location.reload();
  }

  const displayMessage = localMessage ?? sync.statusMessage;

  return (
    <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <p className="text-sm font-semibold text-foreground">Cloud library</p>
      <p className="mt-1 text-xs leading-relaxed text-foreground-muted">
        Supabase is the source of truth. This device keeps a fast copy in{" "}
        <span className="font-mono text-[10px]">{STORAGE_KEY}</span> for startup.
      </p>
      {displayMessage ? (
        <p className="mt-2 text-xs text-foreground-muted">{displayMessage}</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRefreshFromCloud()}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40 disabled:opacity-50"
        >
          Refresh from cloud
        </button>
        <button
          type="button"
          onClick={handleClearCacheAndReload}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-dashed border-border/80 bg-transparent px-4 text-xs font-medium text-foreground-muted active:bg-accent-soft/20"
        >
          Clear local cache and reload
        </button>
      </div>
    </section>
  );
}
