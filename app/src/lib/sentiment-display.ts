import type { SentimentBucket } from "./types";

export function sentimentLabel(bucket: SentimentBucket): string {
  const labels: Record<SentimentBucket, string> = {
    liked: "Liked",
    okay: "Okay",
    disliked: "Didn't like",
  };
  return labels[bucket];
}
