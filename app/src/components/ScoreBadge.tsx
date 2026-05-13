type ScoreBadgeProps = {
  score: number;
  className?: string;
  scoreClassName?: string;
};

/** Compact derived score (bucket-ranked, not pairwise ranking yet). */
export function ScoreBadge({ score, className = "", scoreClassName = "" }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 rounded-full border border-border bg-card-surface px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm ${className}`}
      title="Derived score"
    >
      <span className={`text-xs leading-none ${scoreClassName}`}>{score.toFixed(1)}</span>
    </span>
  );
}
