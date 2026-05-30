"use client";

import Image from "next/image";
import { PROFILE_THEMES, normalizeProfileTheme } from "@/lib/profileTheme";
import type { AppTheme } from "@/lib/types";

export { themePreviewSrc } from "@/lib/profileTheme";

type ProfileDecorationBackdropProps = {
  theme: AppTheme;
};

export function ProfileDecorationBackdrop({ theme }: ProfileDecorationBackdropProps) {
  const key = normalizeProfileTheme(theme);
  const config = PROFILE_THEMES[key] ?? PROFILE_THEMES.matcha;
  const slotOpacity = config.slotOpacity ?? 0.32;

  return (
    <>
      {config.pageBackground ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: config.pageBackground }}
          aria-hidden
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: config.gradient }}
        aria-hidden
      />
      {config.slots.map((slot) => (
        <div
          key={slot.id}
          className={`pointer-events-none ${slot.className}`}
          style={slot.className.includes("opacity-") ? undefined : { opacity: slotOpacity }}
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
