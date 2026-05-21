"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useSupabaseAuth } from "@/components/SupabaseAuthProvider";
import { themePreviewSrc } from "@/components/ProfileDecorationBackdrop";
import { useReadingNook } from "@/lib/app-state";
import { ProfilePhotoPicker } from "@/components/ProfilePhotoPicker";
import { normalizeUsername } from "@/lib/username";
import type { UserProfile } from "@/lib/types";
import { APP_THEMES } from "@/lib/types";

type EditProfileSheetProps = {
  profile: UserProfile;
  onClose: () => void;
  onUsernameSaved?: () => void;
  onAvatarChange?: (url: string | null) => void;
};

export function EditProfileSheet({
  profile,
  onClose,
  onUsernameSaved,
  onAvatarChange,
}: EditProfileSheetProps) {
  const { state, actions } = useReadingNook();
  const { user: cloudUser, configured: cloudConfigured } = useSupabaseAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const nameFieldId = useId();
  const tagFieldId = useId();
  const usernameFieldId = useId();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [tagline, setTagline] = useState(profile.tagline);
  const [username, setUsername] = useState("");
  const [usernameHint, setUsernameHint] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const profileTheme = state.profile.theme ?? "plant";

  useEffect(() => {
    const d = dialogRef.current;
    if (!d?.showModal) return;
    if (!d.open) d.showModal();
  }, []);

  useEffect(() => {
    if (!cloudConfigured || !cloudUser) return;
    void fetch("/api/profile/username")
      .then((res) => res.json())
      .then((data: { username?: string | null }) => {
        if (data.username) setUsername(data.username);
      })
      .catch(() => undefined);
    void fetch("/api/profile/avatar")
      .then((res) => res.json())
      .then((data: { avatarUrl?: string | null }) => {
        setAvatarUrl(data.avatarUrl ?? null);
      })
      .catch(() => undefined);
  }, [cloudConfigured, cloudUser]);

  function handleAvatarChange(url: string | null) {
    setAvatarUrl(url);
    onAvatarChange?.(url);
  }

  const usernameNormalized = normalizeUsername(username);
  const usernameTooShort =
    cloudConfigured && cloudUser && usernameNormalized.length > 0 && usernameNormalized.length < 3;

  useEffect(() => {
    if (!cloudConfigured || !cloudUser || usernameNormalized.length < 3) return;
    const timer = window.setTimeout(() => {
      setUsernameBusy(true);
      void fetch(`/api/profile/username?check=${encodeURIComponent(usernameNormalized)}`)
        .then((res) => res.json())
        .then((data: { available?: boolean; error?: string | null }) => {
          setUsernameAvailable(Boolean(data.available));
          setUsernameHint(data.available ? "Available" : (data.error ?? "Taken"));
        })
        .finally(() => setUsernameBusy(false));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [usernameNormalized, cloudConfigured, cloudUser]);

  async function save(): Promise<void> {
    if (cloudConfigured && cloudUser) {
      const raw = normalizeUsername(username);
      if (raw.length >= 3) {
        const res = await fetch("/api/profile/username", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: raw }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setUsernameHint(data.error ?? "Could not save username.");
          return;
        }
        onUsernameSaved?.();
      }
    }
    actions.updateProfile({ displayName, tagline });
    onClose();
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
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="absolute inset-0 cursor-default border-0 bg-black/35 p-0"
          aria-label="Dismiss"
          tabIndex={-1}
          onClick={() => onClose()}
        />
        <div className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <div className="shrink-0 border-b border-border px-4 pb-3 pt-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p id={headingId} className="font-serif text-lg font-semibold text-foreground">
                  Edit profile
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Name, tagline, background, and device data.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => onClose()}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card-surface text-foreground-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 px-4 py-4">
              {cloudConfigured && cloudUser ? (
                <ProfilePhotoPicker
                  userId={cloudUser.id}
                  name={displayName}
                  avatarUrl={avatarUrl}
                  onAvatarChange={handleAvatarChange}
                />
              ) : null}
              <div className="space-y-1.5">
                <label
                  htmlFor={nameFieldId}
                  className="text-xs font-semibold uppercase tracking-wider text-foreground-muted"
                >
                  Name
                </label>
                <p className="text-xs text-foreground-muted">
                  Your real or preferred name — separate from @username.
                </p>
                <input
                  id={nameFieldId}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-card-surface px-3 py-2 text-sm text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
                />
                <p className="text-right text-[10px] text-foreground-muted tabular-nums">
                  {displayName.length} / 80
                </p>
              </div>

              {cloudConfigured && cloudUser ? (
                <div className="space-y-1.5 rounded-xl border border-border bg-card-surface/80 p-3">
                  <label
                    htmlFor={usernameFieldId}
                    className="text-xs font-semibold uppercase tracking-wider text-foreground-muted"
                  >
                    Username
                  </label>
                  <p className="text-xs text-foreground-muted">
                    Required for Friends. Lowercase letters, numbers, underscore only.
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-foreground-muted">@</span>
                    <input
                      id={usernameFieldId}
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                      maxLength={24}
                      autoComplete="username"
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-inner outline-none focus:border-accent/50"
                    />
                  </div>
                  {usernameTooShort || usernameHint ? (
                    <p
                      className={`text-xs ${
                        usernameAvailable ? "text-accent" : "text-foreground-muted"
                      }`}
                    >
                      {usernameBusy
                        ? "Checking…"
                        : usernameTooShort
                          ? "At least 3 characters."
                          : usernameHint}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label
                  htmlFor={tagFieldId}
                  className="text-xs font-semibold uppercase tracking-wider text-foreground-muted"
                >
                  Tagline
                </label>
                <textarea
                  id={tagFieldId}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-border bg-card-surface px-3 py-2 text-sm text-foreground shadow-inner outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(66,100,71,0.22)]"
                />
                <p className="text-right text-[10px] text-foreground-muted tabular-nums">
                  {tagline.length} / 200
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card-surface/80 p-3">
                <p className="text-sm font-semibold text-foreground">Profile background</p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Decorations and backdrop tint on Profile only. Updates immediately.
                </p>
                <div
                  className="mt-3 grid grid-cols-4 gap-2"
                  role="radiogroup"
                  aria-label="Profile background style"
                >
                  {APP_THEMES.map((theme) => {
                    const selected = profileTheme === theme;
                    const label = theme.charAt(0).toUpperCase() + theme.slice(1);
                    return (
                      <button
                        key={theme}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => actions.updateProfile({ theme })}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 transition-colors ${
                          selected
                            ? "border-accent bg-accent-soft/35 ring-1 ring-accent/30"
                            : "border-border/80 bg-background hover:bg-accent-soft/20"
                        }`}
                      >
                        <span className="relative h-12 w-12">
                          <Image
                            src={themePreviewSrc(theme)}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-contain"
                            sizes="48px"
                          />
                        </span>
                        <span className="text-[10px] font-semibold text-foreground">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border px-4 py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-card-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                className="rounded-xl border border-border bg-accent py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
