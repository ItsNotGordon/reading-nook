"use client";

import Image from "next/image";
import { PROFILE_THEMES } from "@/lib/profileTheme";
import type { AppTheme } from "@/lib/types";

export { themePreviewSrc } from "@/lib/profileTheme";

type ProfileDecorationBackdropProps = {
  theme: AppTheme;
};

export function ProfileDecorationBackdrop({ theme }: ProfileDecorationBackdropProps) {
  const config = PROFILE_THEMES[theme] ?? PROFILE_THEMES.plant;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: config.gradient }}
        aria-hidden
      />
      {config.slots.map((slot) => (
        <div
          key={slot.id}
          className={`pointer-events-none opacity-[0.32] ${slot.className}`}
          aria-hidden
        >
          <Image
            src={slot.src}
            alt=""
            width={slot.width}
            height={slot.height}
            className="h-full w-full object-contain"
            sizes={`${slot.width}px`}
          />
        </div>
      ))}
    </>
  );
}
