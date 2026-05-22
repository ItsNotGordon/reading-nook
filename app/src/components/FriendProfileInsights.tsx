"use client";

import { FriendProfileLibraryCard } from "@/components/FriendProfileLibraryCard";
import { ProfileFavoritesSection } from "@/components/ProfileFavoritesSection";
import { ProfileRecentInsights } from "@/components/ProfileRecentInsights";
import type { FriendProfileSummary } from "@/lib/friendProfileSummary";
import type { BookId } from "@/lib/types";

type FriendProfileInsightsProps = {
  summary: FriendProfileSummary;
  onBookPress: (bookId: BookId) => void;
};

export function FriendProfileInsights({ summary, onBookPress }: FriendProfileInsightsProps) {
  const ratedCount =
    summary.sentimentInsights.reduce((s, i) => s + i.count, 0) || summary.finishedCount;

  if (summary.totalCount === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-card-surface/50 px-4 py-6 text-center text-sm text-foreground-muted">
        No books on their shelves yet.
      </p>
    );
  }

  return (
    <div className="relative z-20 space-y-3 text-left">
      <FriendProfileLibraryCard summary={summary} onBookPress={onBookPress} />

      <ProfileFavoritesSection
        title="Their Favorites"
        favoriteBook={summary.favoriteBook}
        topGenres={summary.topGenres}
        topAuthors={summary.topAuthors}
        genreLinkBase=""
        authorLinkBase=""
      />

      <ProfileRecentInsights
        insights={summary.sentimentInsights}
        ratedFinishedCount={ratedCount}
        mode="friend"
      />
    </div>
  );
}
