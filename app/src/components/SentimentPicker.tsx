"use client";

import type { SentimentBucket } from "@/lib/types";

const OPTIONS: Array<{ bucket: SentimentBucket; title: string }> = [
  { bucket: "liked", title: "Liked it" },
  { bucket: "okay", title: "It was okay" },
  { bucket: "disliked", title: "Didn't like it" },
];

type SentimentPickerProps = {
  value: SentimentBucket | null;
  onChoose: (bucket: SentimentBucket) => void;
};

export function SentimentPicker({ value, onChoose }: SentimentPickerProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {OPTIONS.map((o) => {
        const active = value === o.bucket;
        const baseClass =
          o.bucket === "liked"
            ? "bg-[#cde9cf]"
            : o.bucket === "okay"
              ? "bg-[#f5e8b8]"
              : "bg-[#f6c7c3]";
        const activeFillClass =
          o.bucket === "liked"
            ? "bg-[#426447]"
            : o.bucket === "okay"
              ? "bg-[#e0b93c]"
              : "bg-[#d46457]";
        return (
          <button
            key={o.bucket}
            type="button"
            onClick={() => onChoose(o.bucket)}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <span
              className={`h-12 w-12 rounded-full border border-border transition-colors ${
                active ? activeFillClass : baseClass
              }`}
            />
            <span className="text-[11px] text-foreground-muted">{o.title}</span>
          </button>
        );
      })}
    </div>
  );
}
