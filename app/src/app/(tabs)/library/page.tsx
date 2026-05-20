import { Suspense } from "react";
import { LibraryShelves } from "@/components/LibraryShelves";
import { ThemedPageShell } from "@/components/ThemedPageShell";

export default function LibraryPage() {
  return (
    <ThemedPageShell title="Library">
      <Suspense fallback={null}>
        <LibraryShelves />
      </Suspense>
    </ThemedPageShell>
  );
}
