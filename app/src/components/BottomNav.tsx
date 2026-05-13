"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

function IconLibrary({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 7h8M8 11h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconAdd({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconLeaderboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 10v11M7 10H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3M7 10h10M17 10v11M17 10h3a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-3M12 10V3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 21h6M10 3h4l1 3H9l1-3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFriends({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8.5" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M4 19v-.5a4.5 4.5 0 0 1 9 0V19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="16" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M13.5 19v-.5a3.5 3.5 0 0 1 6.5 0V19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconProfile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M6.5 20.5v-.5a5.5 5.5 0 0 1 11 0v.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

const tabs: Tab[] = [
  { href: "/library", label: "Library", Icon: IconLibrary },
  { href: "/ratings", label: "Ratings", Icon: IconLeaderboard },
  { href: "/add", label: "Add", Icon: IconAdd },
  { href: "/friends", label: "Friends", Icon: IconFriends },
  { href: "/profile", label: "Profile", Icon: IconProfile },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75"
      aria-label="Primary"
    >
      <div
        className="mx-auto flex max-w-lg items-stretch justify-between px-1 pt-1"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors ${
                active
                  ? "text-accent"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <span
                className={
                  active
                    ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_20px_-6px_rgba(66,100,71,0.35)]"
                    : "flex h-9 w-9 shrink-0 items-center justify-center"
                }
              >
                <Icon className="h-6 w-6 shrink-0" />
              </span>
              <span className={`truncate ${active ? "font-semibold text-accent" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
