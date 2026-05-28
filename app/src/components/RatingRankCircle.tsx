type RatingRankCircleProps = {
  rank: number;
  className?: string;
};

/** Circular rank index for ranked rating rows (reference: My Reading Taste list). */
export function RatingRankCircle({ rank, className = "" }: RatingRankCircleProps) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0e8df] text-sm font-semibold tabular-nums text-foreground-muted ${className}`}
      aria-hidden
    >
      {rank}
    </span>
  );
}
