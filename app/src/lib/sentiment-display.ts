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
