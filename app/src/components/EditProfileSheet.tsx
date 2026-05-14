"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReadingNook } from "@/lib/app-state";
import type { UserProfile } from "@/lib/types";

type EditProfileSheetProps = {
  profile: UserProfile;
  onClose: () => void;
};

export function EditProfileSheet({ profile, onClose }: EditProfileSheetProps) {
  const { actions } = useReadingNook();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const nameFieldId = useId();
  const tagFieldId = useId();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [tagline, setTagline] = useState(profile.tagline);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  function save(): void {
    actions.updateProfile({ displayName, tagline });
    onClose();
  }

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
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="absolute inset-0 cursor-default border-0 bg-black/35 p-0"
          aria-label="Dismiss"
          tabIndex={-1}
          onClick={() => onClose()}
        />
        <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="border-b border-border px-4 pb-3 pt-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p id={headingId} className="font-serif text-lg font-semibold text-foreground">
                  Edit profile
                </p>
                <p className="mt-1 text-xs text-foreground-muted">Shown on your Profile tab only (stored on this device).</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => onClose()}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card-surface text-foreground-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="space-y-1.5">
              <label htmlFor={nameFieldId} className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Display name
              </label>
              <input
                id={nameFieldId}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                className="w-full rounded-xl border border-border bg-card-surface px-3 py-2 text-sm text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
              />
              <p className="text-right text-[10px] text-foreground-muted tabular-nums">{displayName.length} / 80</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor={tagFieldId} className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                Tagline
              </label>
              <textarea
                id={tagFieldId}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full resize-y rounded-xl border border-border bg-card-surface px-3 py-2 text-sm text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
              />
              <p className="text-right text-[10px] text-foreground-muted tabular-nums">{tagline.length} / 200</p>
            </div>
          </div>

          <div className="border-t border-border px-4 py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-card-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => save()}
                className="rounded-xl border border-border bg-accent py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
