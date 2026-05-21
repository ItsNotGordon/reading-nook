"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";

type ProfileHeroCardProps = {
  displayName: string;
  tagline: string;
  avatarUrl: string | null;
  cloudConfigured: boolean;
  cloudUser: boolean;
  profileEditGated: boolean;
  usernameRefreshKey?: number;
  onEditProfile: () => void;
};

export function ProfileHeroCard({
  displayName,
  tagline,
  avatarUrl,
  cloudConfigured,
  cloudUser,
  profileEditGated,
  usernameRefreshKey = 0,
  onEditProfile,
}: ProfileHeroCardProps) {
  const [myUsername, setMyUsername] = useState<string | null>(null);

  const showUsername = cloudConfigured && cloudUser;

  useEffect(() => {
    if (!showUsername) return;
    let cancelled = false;
    void fetch("/api/profile/username")
      .then((res) => res.json())
      .then((data: { username?: string | null }) => {
        if (!cancelled) setMyUsername(data.username ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [showUsername, usernameRefreshKey]);

  const showUsernameAsMain = showUsername;
  const displayUsername = showUsername ? myUsername : null;
  const hasUsername = Boolean(displayUsername);

  return (
    <section className="relative rounded-[1.75rem] border border-border bg-card-surface/95 p-5 pt-10 text-center shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <p className="absolute end-4 top-4 max-w-[45%] truncate text-sm font-medium text-foreground-muted">
        {displayName}
      </p>

      <ProfileAvatar
        name={displayName}
        avatarUrl={cloudUser ? avatarUrl : null}
        size="lg"
        className="mx-auto bg-background"
      />

      {showUsernameAsMain && hasUsername ? (
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-foreground">
          {displayUsername}
        </h1>
      ) : showUsernameAsMain && !hasUsername ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onEditProfile}
            className="text-sm font-medium text-amber-900/80 underline-offset-2 hover:underline"
          >
            Set your @username
          </button>
        </div>
      ) : (
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-foreground">
          {displayName}
        </h1>
      )}

      {tagline ? (
        <p className="mt-1 text-sm italic text-foreground-muted">{tagline}</p>
      ) : null}

      <div className="mt-4 flex justify-center gap-2">
        {profileEditGated ? (
          <Link
            href="/login?next=/profile"
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-border bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm active:opacity-90"
          >
            Sign in to customize
          </Link>
        ) : (
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-border bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm active:opacity-90"
          >
            Edit profile
          </button>
        )}
        <Link
          href="/profile/settings"
          className="inline-flex min-h-9 items-center justify-center rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium text-foreground shadow-sm active:bg-accent-soft/40"
        >
          Settings
        </Link>
      </div>
    </section>
  );
}
