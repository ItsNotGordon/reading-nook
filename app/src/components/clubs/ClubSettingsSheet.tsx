"use client";

import { useEffect, useId, useRef } from "react";

type ClubSettingsSheetProps = {
  open: boolean;
  membersCanInvite: boolean;
  onClose: () => void;
  onMembersCanInviteChange: (enabled: boolean) => void;
};

export function ClubSettingsSheet({
  open,
  membersCanInvite,
  onClose,
  onMembersCanInviteChange,
}: ClubSettingsSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[110] m-0 max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/35 [&::backdrop]:bg-black/35"
      aria-labelledby={headingId}
      onClose={() => onClose()}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <button
          type="button"
          className="absolute inset-0 cursor-default border-0 bg-black/35 p-0"
          aria-label="Dismiss"
          tabIndex={-1}
          onClick={() => onClose()}
        />
        <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="border-b border-border px-4 py-3">
            <p id={headingId} className="font-serif text-lg font-semibold text-foreground">
              Club settings
            </p>
          </div>
          <div className="space-y-4 px-4 py-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card-surface/60 px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Members can invite</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  Let any member add people by @username. Admins always can.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={membersCanInvite}
                onClick={() => onMembersCanInviteChange(!membersCanInvite)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  membersCanInvite ? "bg-accent" : "bg-foreground-muted/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    membersCanInvite ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => onClose()}
              className="w-full rounded-xl border border-border bg-accent py-2.5 text-sm font-semibold text-white"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
