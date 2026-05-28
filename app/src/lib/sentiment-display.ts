import type { SentimentBucket } from "./types";

export function sentimentLabel(bucket: SentimentBucket): string {
  const labels: Record<SentimentBucket, string> = {
    liked: "Liked",
    okay: "Okay",
    disliked: "Didn't like",
  };
  return labels[bucket];
}

/** Text color for sentiment labels and counts (matches Ratings / library). */
export function sentimentTextColor(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#426447]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

/** Subtle card surface for profile / insight rows. */
export function sentimentInsightSurface(bucket: SentimentBucket): string {
  if (bucket === "liked") return "border-[#b8d4bc] bg-[#e8f2ea]";
  if (bucket === "okay") return "border-[#e0d4a8] bg-[#faf6e8]";
  return "border-[#e8b4b0] bg-[#faf0ef]";
}

/** Stroke + text color for compact open-book score badges. */
export function sentimentScoreBadgeColor(bucket: SentimentBucket): string {
  if (bucket === "liked") return "text-[#3d6b45]";
  if (bucket === "okay") return "text-[#a27f00]";
  return "text-[#b13d34]";
}

/** Active filter pill (filled) for Ratings sentiment bar. */
export function sentimentFilterPillActive(bucket: SentimentBucket | "all"): string {
  if (bucket === "all") return "border-[#3d6b45] bg-[#3d6b45] text-white";
  if (bucket === "liked") return "border-[#3d6b45] bg-[#3d6b45] text-white";
  if (bucket === "okay") return "border-[#a27f00] bg-[#a27f00] text-white";
  return "border-[#b13d34] bg-[#b13d34] text-white";
}

/** Inactive filter pill border/text accents. */
export function sentimentFilterPillIdle(bucket: SentimentBucket): string {
  if (bucket === "liked") return "border-[#b8d4bc] bg-card-surface text-[#3d6b45]";
  if (bucket === "okay") return "border-[#e0d4a8] bg-card-surface text-[#a27f00]";
  return "border-[#e8b4b0] bg-card-surface text-[#b13d34]";
}
