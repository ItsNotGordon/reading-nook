"use client";

import Link from "next/link";
import {
  authorDisplayLabel,
  getProfileHref,
  profileLinkAriaLabel,
  type ProfileLinkUser,
} from "@/lib/profileLinks";
import type { LikedByPreview } from "@/lib/feedClient";

function LikerName({
  user,
  currentUserId,
}: {
  user: ProfileLinkUser;
  currentUserId: string | null;
}) {
  const label = authorDisplayLabel(user);
  const href = getProfileHref(user, currentUserId);

  if (!href) {
    return <span className="font-semibold text-foreground">{label}</span>;
  }

  return (
    <Link
      href={href}
      className="font-semibold text-foreground hover:text-accent"
      aria-label={profileLinkAriaLabel(user)}
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </Link>
  );
}

type LikedByPreviewLineProps = {
  preview: LikedByPreview | null | undefined;
  currentUserId: string | null;
};

export function LikedByPreviewLine({ preview, currentUserId }: LikedByPreviewLineProps) {
  if (!preview || preview.totalLikes <= 0 || preview.users.length === 0) return null;

  const first = preview.users[0];
  const second = preview.users[1];
  const { totalLikes } = preview;

  if (!first) return null;

  return (
    <p className="mt-1 text-xs font-medium text-foreground-muted">
      <span>Liked by </span>
      <LikerName user={first} currentUserId={currentUserId} />
      {totalLikes === 2 && second ? (
        <>
          <span> and </span>
          <LikerName user={second} currentUserId={currentUserId} />
        </>
      ) : null}
      {totalLikes > 2 && second ? (
        <>
          <span>, </span>
          <LikerName user={second} currentUserId={currentUserId} />
          <span>
            {" "}
            and {totalLikes - 2} other{totalLikes - 2 === 1 ? "" : "s"}
          </span>
        </>
      ) : null}
    </p>
  );
}
