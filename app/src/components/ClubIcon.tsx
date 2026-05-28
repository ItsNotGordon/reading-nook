"use client";

import Image from "next/image";

const SIZE_CLASSES = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
} as const;

const IMAGE_SIZES = {
  sm: 40,
  md: 48,
  lg: 64,
} as const;

export function DefaultClubIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-5 w-5 text-accent ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M9 7h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

type ClubIconProps = {
  name: string;
  iconUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  onClick?: () => void;
};

export function ClubIcon({
  name,
  iconUrl,
  size = "md",
  className = "",
  onClick,
}: ClubIconProps) {
  const sizeClass = SIZE_CLASSES[size];
  const interactive = Boolean(onClick);
  const baseClass = `relative shrink-0 overflow-hidden rounded-xl border border-border bg-accent-soft/30 ${sizeClass} ${interactive ? "cursor-pointer ring-offset-2 hover:ring-2 hover:ring-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" : ""} ${className}`;

  const inner = iconUrl ? (
    <Image
      src={iconUrl}
      alt=""
      fill
      className="object-cover"
      sizes={`${IMAGE_SIZES[size]}px`}
      unoptimized
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center" aria-hidden>
      <DefaultClubIcon />
    </span>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClass}
        aria-label={`Change icon for ${name}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={baseClass} role="img" aria-label={name}>
      {inner}
    </div>
  );
}
