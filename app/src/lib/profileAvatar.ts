import type { Area } from "react-easy-crop";
import { getSupabaseUrl } from "@/lib/supabase/config";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_FILENAME = "avatar.webp";
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 512;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function avatarStoragePath(userId: string): string {
  return `${userId}/${AVATAR_FILENAME}`;
}

export function avatarPublicUrl(userId: string): string {
  const base = getSupabaseUrl().replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${avatarStoragePath(userId)}`;
}

export function isOwnAvatarUrl(userId: string, url: string | null | undefined): boolean {
  if (!url) return false;
  return url === avatarPublicUrl(userId) || url.endsWith(`/${avatarStoragePath(userId)}`);
}

export function validateAvatarFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Use a JPEG, PNG, or WebP image." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller." };
  }
  return { ok: true };
}

export function profileInitials(name: string): string {
  const t = name.trim();
  if (!t) return "RN";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Could not load image.")));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

export async function getCroppedImageBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = AVATAR_OUTPUT_SIZE;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not export image."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      0.9,
    );
  });
}
