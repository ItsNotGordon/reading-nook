"use client";

type ShareSentimentToFeedToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function ShareSentimentToFeedToggle({
  checked,
  onChange,
  disabled = false,
}: ShareSentimentToFeedToggleProps) {
  return (
    <label
      className={`flex items-start gap-2.5 rounded-xl border border-border/80 bg-card-surface/60 px-3 py-2.5 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent focus:ring-accent/35 disabled:cursor-not-allowed"
        aria-label="Share this update to feed"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">Share this update to feed</span>
        <span className="mt-0.5 block text-xs text-foreground-muted">
          {disabled
            ? "Private books cannot be shared to the feed."
            : "Friends will see that you changed how you felt about this book."}
        </span>
      </span>
    </label>
  );
}
