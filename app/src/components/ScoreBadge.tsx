import { OpenBookScoreBadge } from "@/components/OpenBookScoreBadge";
import type { SentimentBucket } from "@/lib/types";

type ScoreBadgeProps = {
  score: number;
  bucket?: SentimentBucket;
  className?: string;
  /** @deprecated Use `bucket` for open-book badge coloring. */
  scoreClassName?: string;
};

/** Compact derived score in open-book outline when `bucket` is set. */
export function ScoreBadge({ score, bucket, className = "" }: ScoreBadgeProps) {
  if (bucket) {
    return <OpenBookScoreBadge score={score} bucket={bucket} className={className} width={46} height={34} />;
  }
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 rounded-full border border-border bg-card-surface px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm ${className}`}
      title="Derived score"
    >
      <span className="text-xs leading-none">{score.toFixed(1)}</span>
    </span>
  );
}
