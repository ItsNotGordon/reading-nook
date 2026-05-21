"use client";

import Link from "next/link";
import { CoverThumb } from "@/components/CoverThumb";
import type { FavoriteBookVm } from "@/lib/profileStats";

type GenreRow = { label: string; count: number };
type AuthorRow = { label: string; count: number };

type ProfileFavoritesSectionProps = {
  title: string;
  favoriteBook: FavoriteBookVm;
  topGenres: GenreRow[];
  topAuthors: AuthorRow[];
  onFavoriteBookClick?: () => void;
  genreLinkBase?: string;
  authorLinkBase?: string;
};

export function ProfileFavoritesSection({
  title,
  favoriteBook,
  topGenres,
  topAuthors,
  onFavoriteBookClick,
  genreLinkBase = "/ratings",
  authorLinkBase = "/ratings",
}: ProfileFavoritesSectionProps) {
  return (
    <details className="group rounded-2xl border border-border bg-card-surface/95 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-foreground-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </div>
      </summary>
      <div className="space-y-4 border-t border-border/80 px-4 pb-4 pt-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Favorite book
          </p>
          {favoriteBook ? (
            onFavoriteBookClick ? (
              <button
                type="button"
                onClick={onFavoriteBookClick}
                className="mt-2 flex w-full items-center gap-3 rounded-xl border border-border/80 bg-background p-3 text-left transition-colors hover:bg-accent-soft/25 active:bg-accent-soft/40"
              >
                <CoverThumb
                  src={favoriteBook.coverUrl}
                  alt=""
                  sizes="56px"
                  fallbackLetter={favoriteBook.title}
                  className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-border"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{favoriteBook.title}</p>
                  <p className="truncate text-xs text-foreground-muted">{favoriteBook.author}</p>
                </div>
              </button>
            ) : (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-border/80 bg-background p-3">
                <CoverThumb
                  src={favoriteBook.coverUrl}
                  alt=""
                  sizes="56px"
                  fallbackLetter={favoriteBook.title}
                  className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-border"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{favoriteBook.title}</p>
                  <p className="truncate text-xs text-foreground-muted">{favoriteBook.author}</p>
                </div>
              </div>
            )
          ) : (
            <p className="mt-2 text-sm text-foreground-muted">
              Finish and rank a few books to reveal your favorite.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Favorite genres
          </p>
          {topGenres.length > 0 ? (
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {topGenres.map((g, idx) => (
                <li key={g.label}>
                  {genreLinkBase ? (
                    <Link
                      href={`${genreLinkBase}?genre=${encodeURIComponent(g.label)}`}
                      className="block rounded-xl border border-border/80 bg-background px-3 py-2 text-xs text-foreground transition-colors hover:bg-accent-soft/25 active:bg-accent-soft/40"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-foreground-muted">
                        {String(idx + 1).padStart(2, "0")}
                      </p>
                      <p className="mt-0.5 line-clamp-1 font-medium">{g.label}</p>
                    </Link>
                  ) : (
                    <span className="block rounded-xl border border-border/80 bg-background px-3 py-2 text-xs">
                      <p className="line-clamp-1 font-medium">{g.label}</p>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-foreground-muted">No genre data yet.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Favorite authors
          </p>
          {topAuthors.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {topAuthors.map((a) => (
                <li key={a.label}>
                  {authorLinkBase ? (
                    <Link
                      href={`${authorLinkBase}?author=${encodeURIComponent(a.label)}`}
                      className="inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent-soft/25 active:bg-accent-soft/40"
                    >
                      {a.label} <span className="text-foreground-muted">({a.count})</span>
                    </Link>
                  ) : (
                    <span className="inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium">
                      {a.label} <span className="text-foreground-muted">({a.count})</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-foreground-muted">Finish a few books to surface favorites.</p>
          )}
        </div>
      </div>
    </details>
  );
}
