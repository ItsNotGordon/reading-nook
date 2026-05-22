"use client";

import { CoverThumb } from "@/components/CoverThumb";
import type { TasteComparison } from "@/lib/tasteComparison";
import { sentimentLabel, sentimentTextColor } from "@/lib/sentiment-display";
import type { BookId, SentimentBucket } from "@/lib/types";

type FriendCompareTasteProps = {
  comparison: TasteComparison;
  friendName: string;
  onBookPress?: (bookId: BookId) => void;
};

function formatRating(score: number | null, sentiment: SentimentBucket | null): string {
  if (score != null) return score.toFixed(1);
  if (sentiment) return sentimentLabel(sentiment);
  return "—";
}

export function FriendCompareTaste({ comparison, friendName, onBookPress }: FriendCompareTasteProps) {
  const hasBooks = comparison.sharedRatedBooks.length > 0;
  const hasGenres = comparison.sharedGenres.length > 0;
  const hasAuthors = comparison.sharedAuthors.length > 0;
  const hasAny = hasBooks || hasGenres || hasAuthors;

  if (!hasAny) {
    return (
      <p className="text-xs text-foreground-muted">
        No overlap yet — finish and rate a few books to compare.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-left">
      {hasBooks ? (
        <div>
          <p className="text-xs font-semibold text-foreground">Books you both rated</p>
          <ul className="mt-2 space-y-2">
            {comparison.sharedRatedBooks.map((row) => {
              const content = (
                <>
                  <CoverThumb
                    src={row.coverUrl}
                    alt=""
                    sizes="40px"
                    fallbackLetter={row.title}
                    className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                    <p className="truncate text-xs text-foreground-muted">{row.author}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-semibold text-foreground-muted">You</p>
                        <p
                          className={`font-semibold tabular-nums ${
                            row.yourSentiment ? sentimentTextColor(row.yourSentiment) : "text-foreground"
                          }`}
                        >
                          {formatRating(row.yourScore, row.yourSentiment)}
                          {row.yourScore != null && row.yourSentiment ? (
                            <span className="ml-1 font-medium opacity-80">
                              ({sentimentLabel(row.yourSentiment)})
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground-muted">{friendName}</p>
                        <p
                          className={`font-semibold tabular-nums ${
                            row.friendSentiment
                              ? sentimentTextColor(row.friendSentiment)
                              : "text-foreground"
                          }`}
                        >
                          {formatRating(row.friendScore, row.friendSentiment)}
                          {row.friendScore != null && row.friendSentiment ? (
                            <span className="ml-1 font-medium opacity-80">
                              ({sentimentLabel(row.friendSentiment)})
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              );
              return (
                <li key={row.bookId}>
                  {onBookPress ? (
                    <button
                      type="button"
                      onClick={() => onBookPress(row.bookId)}
                      className="flex w-full gap-2.5 rounded-xl border border-border/80 bg-background p-2.5 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft/20 active:bg-accent-soft/40"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex gap-2.5 rounded-xl border border-border/80 bg-background p-2.5">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {hasGenres ? (
        <p className="text-xs text-foreground-muted">
          <span className="font-semibold text-foreground">Shared genres:</span>{" "}
          {comparison.sharedGenres.join(", ")}
        </p>
      ) : null}

      {hasAuthors ? (
        <p className="text-xs text-foreground-muted">
          <span className="font-semibold text-foreground">Shared authors:</span>{" "}
          {comparison.sharedAuthors.join(", ")}
        </p>
      ) : null}
    </div>
  );
}
