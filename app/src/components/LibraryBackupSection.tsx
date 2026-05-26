"use client";

import { useRef, useState } from "react";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { useReadingNook } from "@/lib/app-state";
import { downloadLibraryBackup, readLibraryBackupFile } from "@/lib/libraryBackup";

export function LibraryBackupSection() {
  const { state, actions } = useReadingNook();
  const { user: cloudUser, configured: cloudConfigured } = useSupabaseAuth();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <p className="text-sm font-semibold text-foreground">Library backup</p>
      <p className="mt-1 text-xs text-foreground-muted">
        Export a JSON backup or import from a file. Import replaces your current library and syncs
        the change to your account.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => downloadLibraryBackup(state)}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
        >
          Export backup
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
        >
          Import backup
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void readLibraryBackupFile(file)
              .then((next) => {
                const ok = window.confirm(
                  "Replace your library with this backup? This cannot be undone.",
                );
                if (!ok) return;
                actions.hydrateLibrary(next);
                setImportMessage("Library imported and syncing to cloud.");
                if (cloudConfigured && cloudUser) {
                  void fetch("/api/sync", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ state: next }),
                  });
                }
              })
              .catch((err: unknown) => {
                setImportMessage(err instanceof Error ? err.message : "Could not import backup.");
              });
          }}
        />
      </div>
      {importMessage ? <p className="mt-2 text-xs text-foreground-muted">{importMessage}</p> : null}

      <div className="mt-4 rounded-xl border border-dashed border-amber-900/25 bg-background/80 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-900/70">
          Delete library
        </p>
        <p className="mt-2 text-xs leading-relaxed text-foreground-muted">
          Remove every book from your shelves, clear progress and ratings. This will also clear your
          cloud library. Export a backup first if you might need it later. You cannot undo this.
        </p>
        <button
          type="button"
          onClick={() => downloadLibraryBackup(state)}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm active:bg-accent-soft/40"
        >
          Export backup before clearing
        </button>
        <button
          type="button"
          onClick={() => {
            const ok = window.confirm(
              "Clear all library data? This will also clear your cloud copy. Export a backup first. This cannot be undone.",
            );
            if (!ok) return;
            const exported = window.confirm(
              "Did you export a backup? Choose OK only if you are sure you want to clear everything.",
            );
            if (exported) actions.resetLibrary();
          }}
          className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-amber-900/35 bg-background px-4 text-sm font-semibold text-amber-950 shadow-sm active:bg-amber-100/60"
        >
          Clear all library data
        </button>
      </div>
    </section>
  );
}
