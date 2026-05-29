"use client";

import { useEffect, useId, useRef, useState } from "react";

type ClubEditSheetProps = {
  open: boolean;
  name: string;
  description: string;
  isPublic: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; isPublic: boolean }) => Promise<boolean>;
};

export function ClubEditSheet({
  open,
  name: initialName,
  description: initialDescription,
  isPublic: initialIsPublic,
  onClose,
  onSave,
}: ClubEditSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setDescription(initialDescription);
    setIsPublic(initialIsPublic);
    setError(null);
  }, [open, initialName, initialDescription, initialIsPublic]);

  if (!open) return null;

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const ok = await onSave({
      name: trimmedName,
      description: description.trim(),
      isPublic,
    });
    setSaving(false);
    if (ok) onClose();
    else setError("Could not save changes. Try again.");
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
      <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 cursor-default border-0 bg-black/35 p-0"
          aria-label="Dismiss"
          tabIndex={-1}
          onClick={() => onClose()}
        />
        <div className="relative z-10 flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl sm:rounded-2xl">
          <div className="border-b border-border px-4 py-3">
            <p id={headingId} className="font-serif text-lg font-semibold text-foreground">
              Edit club
            </p>
          </div>
          <div className="space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <label className="text-xs font-semibold text-foreground-muted">Club name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Page Turners"
                maxLength={60}
                autoFocus
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-muted">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's your club about?"
                rows={3}
                maxLength={300}
                className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card-surface/60 px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Public club</p>
                <p className="mt-0.5 text-xs text-foreground-muted">
                  Anyone can discover and join without an invite code.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  isPublic ? "bg-accent" : "bg-foreground-muted/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    isPublic ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
          </div>
          <div className="flex gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => onClose()}
              disabled={saving}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-foreground-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="flex-1 rounded-xl border border-accent bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
