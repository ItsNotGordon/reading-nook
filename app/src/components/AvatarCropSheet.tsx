"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImageBlob } from "@/lib/profileAvatar";

type AvatarCropSheetProps = {
  imageSrc: string;
  onClose: () => void;
  onSave: (blob: Blob) => Promise<void>;
};

export function AvatarCropSheet({ imageSrc, onClose, onSave }: AvatarCropSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  async function handleSave() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      await onSave(blob);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[120] m-0 max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-black/40 [&::backdrop]:bg-black/40"
      aria-labelledby={headingId}
      onClose={() => onClose()}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="fixed inset-0 flex flex-col bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => onClose()}
            className="text-sm font-medium text-foreground-muted"
          >
            Cancel
          </button>
          <p id={headingId} className="text-sm font-semibold text-foreground">
            Move and zoom
          </p>
          <button
            type="button"
            disabled={busy || !croppedAreaPixels}
            onClick={() => void handleSave()}
            className="text-sm font-semibold text-accent disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="border-t border-border px-4 py-4">
          <label className="text-xs font-medium text-foreground-muted">Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="mt-2 w-full"
          />
          {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
        </div>
      </div>
    </dialog>
  );
}
