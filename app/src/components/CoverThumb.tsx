"use client";

import Image from "next/image";
import { useState } from "react";

type CoverThumbProps = {
  src: string;
  /** Empty string uses decorative-only presentation when cover shows. */
  alt: string;
  sizes: string;
  /** Container box (must include `relative` for fill). */
  className?: string;
  /** Shown on failed load (e.g. first letter of title). */
  fallbackLetter?: string;
};

/**
 * Small catalog/recommendation cover with placeholder on load error (broken URLs, blocked images).
 */
export function CoverThumb({
  src,
  alt,
  sizes,
  className = "relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-border",
  fallbackLetter,
}: CoverThumbProps) {
  const hasSrc = typeof src === "string" && src.trim() !== "";
  const [failed, setFailed] = useState(!hasSrc);
  const letter = (fallbackLetter ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className={className}>
      {hasSrc && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-accent-soft/40 font-serif text-sm font-semibold text-foreground/70"
          aria-hidden
        >
          {letter}
        </div>
      )}
    </div>
  );
}
