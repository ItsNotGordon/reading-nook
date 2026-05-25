"use client";

type YearFilterBarProps = {
  minYear: string;
  maxYear: string;
  onMinYearChange: (value: string) => void;
  onMaxYearChange: (value: string) => void;
};

export function YearFilterBar({
  minYear,
  maxYear,
  onMinYearChange,
  onMaxYearChange,
}: YearFilterBarProps) {
  const hasFilter = minYear !== "" || maxYear !== "";
  const parsedMin = minYear !== "" ? parseInt(minYear, 10) : null;
  const parsedMax = maxYear !== "" ? parseInt(maxYear, 10) : null;
  const invalid =
    parsedMin != null &&
    !Number.isNaN(parsedMin) &&
    parsedMax != null &&
    !Number.isNaN(parsedMax) &&
    parsedMin > parsedMax;

  let summary: string | null = null;
  if (!invalid) {
    if (parsedMin != null && !Number.isNaN(parsedMin) && (parsedMax == null || Number.isNaN(parsedMax))) {
      summary = `Published after ${parsedMin}`;
    } else if ((parsedMin == null || Number.isNaN(parsedMin)) && parsedMax != null && !Number.isNaN(parsedMax)) {
      summary = `Published before ${parsedMax}`;
    } else if (parsedMin != null && !Number.isNaN(parsedMin) && parsedMax != null && !Number.isNaN(parsedMax)) {
      summary = `Published ${parsedMin}–${parsedMax}`;
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-medium text-foreground-muted">Published year</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="Min"
          value={minYear}
          onChange={(e) => onMinYearChange(e.target.value)}
          className="h-8 w-[5.5rem] rounded-lg border border-border bg-card-surface px-2 text-xs text-foreground outline-none placeholder:text-foreground-muted/60 focus:border-accent/50"
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder="Max"
          value={maxYear}
          onChange={(e) => onMaxYearChange(e.target.value)}
          className="h-8 w-[5.5rem] rounded-lg border border-border bg-card-surface px-2 text-xs text-foreground outline-none placeholder:text-foreground-muted/60 focus:border-accent/50"
        />
        {hasFilter ? (
          <button
            type="button"
            onClick={() => {
              onMinYearChange("");
              onMaxYearChange("");
            }}
            className="shrink-0 text-xs font-semibold text-accent active:text-accent/70"
          >
            Clear
          </button>
        ) : null}
      </div>
      {invalid ? (
        <p className="text-xs font-medium text-red-500">Min year must be before max year.</p>
      ) : summary ? (
        <p className="text-xs text-foreground-muted">{summary}</p>
      ) : null}
    </div>
  );
}
