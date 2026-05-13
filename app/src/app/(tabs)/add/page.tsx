import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { AddTabClient } from "@/components/AddTabClient";

export default function AddPage() {
  return (
    <PageShell title="Add">
      <Suspense
        fallback={
          <p className="rounded-2xl border border-border bg-card-surface/60 px-4 py-8 text-center text-sm text-foreground-muted">
            Loading…
          </p>
        }
      >
        <AddTabClient />
      </Suspense>
    </PageShell>
  );
}
