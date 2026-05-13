type ProgressBarProps = {
  mode: "exact" | "estimated";
  /** Exact: confirmed fraction 0–1. Estimated: midpoint for accessibility when band is set. */
  value: number;
  /** Estimated: [lo, hi] with lo = start of uncertain band — 0→lo is green, lo→hi is yellow. */
  estimatedBand?: [number, number];
  "aria-label"?: string;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Confirmed progress = green through the stretch before uncertainty.
 * Estimated band = yellow. Remaining track = white/clear behind a thin gray border.
 */
export function ProgressBar({
  mode,
  value,
  estimatedBand,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const trackClass =
    "relative h-3 w-full overflow-hidden rounded-full border border-border bg-progress-unread";

  if (mode === "exact") {
    const v = clamp01(value);
    const pct = Math.round(v * 100);
    return (
      <div
        className="w-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={ariaLabel ?? "Reading progress"}
      >
        <div className={trackClass}>
          <div
            className="absolute inset-y-0 left-0 bg-progress-exact transition-[width] duration-300 ease-out"
            style={{ width: `${v * 100}%` }}
          />
        </div>
      </div>
    );
  }

  const lo = estimatedBand ? clamp01(estimatedBand[0]) : null;
  const hi = estimatedBand ? clamp01(estimatedBand[1]) : null;
  const useBand = lo !== null && hi !== null && hi > lo;

  const midPct = useBand
    ? Math.round(((lo! + hi!) / 2) * 100)
    : Math.round(clamp01(value) * 100);

  const greenPct = useBand ? lo! * 100 : 0;
  const yellowPct = useBand ? (hi! - lo!) * 100 : clamp01(value) * 100;

  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={midPct}
      aria-label={ariaLabel ?? "Estimated reading progress"}
    >
      <div className={trackClass}>
        {useBand ? (
          <>
            {greenPct > 0 ? (
              <div
                className="absolute inset-y-0 left-0 bg-progress-exact transition-[width] duration-300 ease-out"
                style={{ width: `${greenPct}%` }}
              />
            ) : null}
            <div
              className="absolute inset-y-0 bg-progress-estimated-band transition-[left,width] duration-300 ease-out"
              style={{
                left: `${greenPct}%`,
                width: `${yellowPct}%`,
              }}
            />
          </>
        ) : (
          /* Rare fallback: no band — show whole uncertain stretch as yellow */
          <div
            className="absolute inset-y-0 left-0 bg-progress-estimated-band transition-[width] duration-300 ease-out"
            style={{ width: `${yellowPct}%` }}
          />
        )}
      </div>
    </div>
  );
}
