"use client";

import { useId, useRef, useState } from "react";
import { AvatarCropSheet } from "@/components/AvatarCropSheet";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import {
  AVATAR_BUCKET,
  avatarPublicUrl,
  avatarStoragePath,
  validateAvatarFile,
} from "@/lib/profileAvatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfilePhotoPickerProps = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  size?: "lg" | "xl";
  onAvatarChange: (url: string | null) => void;
};

export function ProfilePhotoPicker({
  userId,
  name,
  avatarUrl,
  size = "xl",
  onAvatarChange,
}: ProfilePhotoPickerProps) {
  const galleryInputId = useId();
  const cameraInputId = useId();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openGallery() {
    setMenuOpen(false);
    galleryRef.current?.click();
  }

  function openCamera() {
    setMenuOpen(false);
    cameraRef.current?.click();
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const check = validateAvatarFile(file);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  }

  async function uploadBlob(blob: Blob) {
    const client = createSupabaseBrowserClient();
    const path = avatarStoragePath(userId);
    const { error: uploadError } = await client.storage
      .from(AVATAR_BUCKET)
      .upload(path, blob, { upsert: true, contentType: "image/webp" });

    if (uploadError) throw new Error(uploadError.message);

    const publicUrl = avatarPublicUrl(userId);
    const res = await fetch("/api/profile/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: publicUrl }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Could not save profile photo.");

    onAvatarChange(`${publicUrl}?v=${Date.now()}`);
  }

  async function removePhoto() {
    setMenuOpen(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not remove photo.");
      onAvatarChange(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove photo.");
    } finally {
      setBusy(false);
    }
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <ProfileAvatar
        name={name}
        avatarUrl={avatarUrl}
        size={size}
        onClick={() => setMenuOpen(true)}
      />
      <p className="text-xs text-foreground-muted">Tap photo to change</p>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {busy ? <p className="text-xs text-foreground-muted">Updating photo…</p> : null}

      <input
        ref={galleryRef}
        id={galleryInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        id={cameraInputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="sr-only"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {menuOpen ? (
        <dialog
          open
          className="fixed inset-0 z-[115] m-0 flex max-h-none max-w-none items-end justify-center border-0 bg-transparent p-0 sm:items-center"
          onClose={() => setMenuOpen(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenuOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl border border-border bg-background p-4 shadow-2xl sm:rounded-2xl"
            role="menu"
          >
            <p className="mb-3 text-center text-sm font-semibold text-foreground">Profile photo</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={openCamera}
                className="min-h-11 rounded-xl border border-border bg-card-surface px-4 text-sm font-semibold"
              >
                Take photo
              </button>
              <button
                type="button"
                onClick={openGallery}
                className="min-h-11 rounded-xl border border-border bg-card-surface px-4 text-sm font-semibold"
              >
                Choose from library
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => void removePhoto()}
                  className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-red-800"
                >
                  Remove photo
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="min-h-10 text-sm text-foreground-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      ) : null}

      {cropSrc ? (
        <AvatarCropSheet
          imageSrc={cropSrc}
          onClose={closeCrop}
          onSave={async (blob) => {
            setBusy(true);
            try {
              await uploadBlob(blob);
            } finally {
              setBusy(false);
              closeCrop();
            }
          }}
        />
      ) : null}
    </div>
  );
}
