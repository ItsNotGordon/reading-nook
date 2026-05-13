import { LibraryShelves } from "@/components/LibraryShelves";
import { PageShell } from "@/components/PageShell";

export default function LibraryPage() {
  return (
    <PageShell title="Library">
      <LibraryShelves />
    </PageShell>
  );
}
