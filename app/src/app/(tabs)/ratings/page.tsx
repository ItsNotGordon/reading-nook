import { Suspense } from "react";
import { RatingsPageClient } from "@/components/RatingsPageClient";

export default function RatingsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-center text-sm text-foreground-muted">Loading ratings…</div>
      }
    >
      <RatingsPageClient />
    </Suspense>
  );
}
