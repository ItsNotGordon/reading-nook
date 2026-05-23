"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { normalizeUsername } from "@/lib/username";

export type SocialConnectionUser = {
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  tagline: string;
};

type SocialConnectionsSheetProps = {
  title: "Following" | "Followers";
  users: SocialConnectionUser[];
  onClose: () => void;
};

export function SocialConnectionsSheet({ title, users, onClose }: SocialConnectionsSheetProps) {
  const router = useRouter();
  const headingId = useId();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const portalTarget = typeof document !== "undefined" ? document.body : null;
  if (!portalTarget) return null;

  const openProfile = (username: string | null) => {
    if (!username) return;
    onClose();
    router.push(`/friends/${encodeURIComponent(normalizeUsername(username))}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/35 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 border-0 bg-transparent p-0"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative z-10 flex max-h-[min(88dvh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id={headingId} className="font-serif text-lg font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card-surface text-lg leading-none text-foreground-muted hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {users.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-foreground-muted">
              {title === "Following"
                ? "No friends here yet. Find people on the Friends tab — public accounts you follow will show up here later too."
                : "No one here yet. Find people on the Friends tab and send a request."}
            </p>
          ) : (
            <ul className="space-y-1">
              {users.map((u) => (
                <li key={u.userId}>
                  <button
                    type="button"
                    disabled={!u.username}
                    onClick={() => openProfile(u.username)}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-accent-soft/25 active:bg-accent-soft/35 disabled:opacity-60"
                  >
                    <ProfileAvatar name={u.displayName} avatarUrl={u.avatarUrl} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {u.username ? `@${u.username}` : u.displayName}
                      </span>
                      {u.username ? (
                        <span className="block truncate text-xs text-foreground-muted">
                          {u.displayName}
                        </span>
                      ) : u.tagline ? (
                        <span className="block truncate text-xs text-foreground-muted">{u.tagline}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
