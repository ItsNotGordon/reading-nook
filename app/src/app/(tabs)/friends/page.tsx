import Link from "next/link";
import { PageShell } from "@/components/PageShell";

export default function FriendsPage() {
  return (
    <PageShell title="Friends">
      <div className="rounded-2xl border border-dashed border-border/80 bg-card-surface/60 px-4 py-8 text-center shadow-inner">
        <p className="text-sm font-medium text-foreground">Friends&apos; libraries aren&apos;t here yet</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
          Browsing shared shelves will need sign-in and a backend, so this tab is a placeholder until further
          notice. For now, use{" "}
          <Link href="/library" className="font-medium text-accent underline-offset-2 hover:underline">
            Library
          </Link>{" "}
          and{" "}
          <Link href="/add" className="font-medium text-accent underline-offset-2 hover:underline">
            Add
          </Link>{" "}
          for your own nook.
        </p>
      </div>
    </PageShell>
  );
}
