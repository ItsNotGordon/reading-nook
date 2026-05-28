import type { SentimentBucket } from "@/lib/types";
import { sentimentScoreBadgeColor } from "@/lib/sentiment-display";

type OpenBookScoreBadgeProps = {
  score: number;
  bucket: SentimentBucket;
  className?: string;
  /** Default sized to fill rating-row right side. */
  width?: number;
  height?: number;
};

/**
 * Compact, clearly-open-book badge built from two page halves.
 * Includes subtle top valley, bottom center dip, and faint center crease.
 */
export function OpenBookScoreBadge({
  score,
  bucket,
  className = "",
  width = 52,
  height = 36,
}: OpenBookScoreBadgeProps) {
  const colorClass = sentimentScoreBadgeColor(bucket);
  const label = score.toFixed(1);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${colorClass} ${className}`}
      style={{ width, height }}
      aria-label={`Score ${label}`}
      title={`Score ${label}`}
    >
      <svg
        viewBox="0 0 52 36"
        width={width}
        height={height}
        className="absolute inset-0"
        aria-hidden
      >
        <path
          d="M 5 11
             C 9 7, 16 6.6, 24.8 8.7
             C 25.4 8.95, 25.8 9.35, 26 9.9
             C 26.2 9.35, 26.6 8.95, 27.2 8.7
             C 36 6.6, 43 7, 47 11
             L 47 31
             C 43 28, 36 27.2, 27.2 28.8
             C 26.6 29.1, 26.2 29.5, 26 30
             C 25.8 29.5, 25.4 29.1, 24.8 28.8
             C 16 27.2, 9 28, 5 31
             Z"
          fill="currentColor"
          fillOpacity="0.08"
        />
        <path
          d="M 5 11
             C 9 7, 16 6.6, 24.8 8.7
             C 25.4 8.95, 25.8 9.35, 26 9.9
             C 26.2 9.35, 26.6 8.95, 27.2 8.7
             C 36 6.6, 43 7, 47 11
             L 47 31
             C 43 28, 36 27.2, 27.2 28.8
             C 26.6 29.1, 26.2 29.5, 26 30
             C 25.8 29.5, 25.4 29.1, 24.8 28.8
             C 16 27.2, 9 28, 5 31
             Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M 8 31.9 L 44 31.9"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.6"
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden
        />
      </svg>
      <span className="relative z-[1] text-[14px] font-bold leading-none tracking-tight tabular-nums">
        {label}
      </span>
    </span>
  );
}
