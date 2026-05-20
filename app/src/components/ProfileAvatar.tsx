"use client";

import Image from "next/image";
import { profileInitials } from "@/lib/profileAvatar";

const SIZE_CLASSES = {
  sm: "h-10 w-10 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-20 w-20 text-xl",
  xl: "h-24 w-24 text-2xl",
} as const;

const IMAGE_SIZES = {
  sm: 40,
  md: 56,
  lg: 80,
  xl: 96,
} as const;

type ProfileAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  onClick?: () => void;
};

export function ProfileAvatar({
  name,
  avatarUrl,
  size = "lg",
  className = "",
  onClick,
}: ProfileAvatarProps) {
  const initials = profileInitials(name);
  const sizeClass = SIZE_CLASSES[size];
  const interactive = Boolean(onClick);
  const baseClass = `relative shrink-0 overflow-hidden rounded-full border border-border bg-card-surface font-serif font-semibold text-foreground ${sizeClass} ${interactive ? "cursor-pointer ring-offset-2 hover:ring-2 hover:ring-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" : ""} ${className}`;

  const inner = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt=""
      fill
      className="object-cover"
      sizes={`${IMAGE_SIZES[size]}px`}
      unoptimized
    />
  ) : (
    <span className="flex h-full w-full items-center justify-center">{initials}</span>
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClass}
        aria-label="Change profile photo"
      >
        {inner}
      </button>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}
