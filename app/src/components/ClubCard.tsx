"use client";

import Link from "next/link";
import Image from "next/image";
import { ClubIcon } from "@/components/ClubIcon";
import type { Club } from "@/lib/clubClient";

type ClubCardProps = {
  club: Club;
};

export function ClubCard({ club }: ClubCardProps) {
  return (
    <Link
      href={`/clubs/${club.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card-surface/95 p-3 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px] active:bg-accent-soft/20"
    >
      {club.iconUrl ? (
        <ClubIcon name={club.name} iconUrl={club.iconUrl} size="md" className="shadow-sm" />
      ) : club.currentBook?.coverUrl ? (
        <Image
          src={club.currentBook.coverUrl}
          alt=""
          width={40}
          height={60}
          className="h-[60px] w-[40px] shrink-0 rounded-lg object-cover shadow-sm"
          unoptimized
        />
      ) : (
        <ClubIcon name={club.name} iconUrl={null} size="md" className="shadow-sm" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{club.name}</p>
          {club.isPublic ? (
            <span className="shrink-0 rounded-full bg-accent-soft/20 px-1.5 py-0.5 text-[9px] font-medium text-accent">
              Public
            </span>
          ) : null}
        </div>
        {club.description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-foreground-muted">{club.description}</p>
        ) : null}
        <div className="mt-1 flex items-center gap-3 text-[10px] text-foreground-muted">
          <span>{club.memberCount} member{club.memberCount !== 1 ? "s" : ""}</span>
          {club.currentBook ? (
            <span className="truncate">Reading: {club.currentBook.title}</span>
          ) : null}
        </div>
      </div>
      <svg className="h-4 w-4 shrink-0 text-foreground-muted" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
      </svg>
    </Link>
  );
}
