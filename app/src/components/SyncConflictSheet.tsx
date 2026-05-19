"use client";

import { useEffect, useId, useRef } from "react";
import { formatSyncTime } from "@/lib/cloudSync";

type SyncConflictSheetProps = {
  localCount: number;
  cloudCount: number;
  cloudUpdatedAt: string;
  onChooseLocal: () => void;
  onChooseCloud: () => void;
};

export function SyncConflictSheet({
  localCount,
  cloudCount,
  cloudUpdatedAt,
  onChooseLocal,
  onChooseCloud,
}: SyncConflictSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[120] m-0 max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/40 [&::backdrop]:bg-black/40"
      aria-labelledby={headingId}
      onCancel={(e) => {
        e.preventDefault();
      }}
    >
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background p-4 shadow-2xl">
          <p id={headingId} className="font-serif text-lg font-semibold text-foreground">
            Two libraries found
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            This device and your cloud backup both have books, but they do not match. Choose which
            copy to keep. The other will be replaced.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="rounded-xl border border-border bg-card-surface px-3 py-2.5">
              <span className="font-semibold text-foreground">This device</span>
              <span className="text-foreground-muted"> — {localCount} shelved book{localCount === 1 ? "" : "s"}</span>
            </li>
            <li className="rounded-xl border border-border bg-card-surface px-3 py-2.5">
              <span className="font-semibold text-foreground">Cloud</span>
              <span className="text-foreground-muted">
                {" "}
                — {cloudCount} shelved book{cloudCount === 1 ? "" : "s"}, updated{" "}
                {formatSyncTime(cloudUpdatedAt)}
              </span>
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={onChooseLocal}
              className="min-h-11 rounded-xl border border-accent bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Use this device (upload to cloud)
            </button>
            <button
              type="button"
              onClick={onChooseCloud}
              className="min-h-11 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground"
            >
              Use cloud (replace this device)
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
