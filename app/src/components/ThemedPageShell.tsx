"use client";

import { ProfileDecorationBackdrop } from "@/components/ProfileDecorationBackdrop";
import { useReadingNook } from "@/lib/app-state";

type ThemedPageShellProps = {
  children: React.ReactNode;
  title?: string;
};

/** Main column with profile theme gradient + decorations behind content. */
export function ThemedPageShell({ children, title }: ThemedPageShellProps) {
  const { state } = useReadingNook();
  const theme = state.profile.theme ?? "plant";

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]">
        <div className="relative isolate -mx-4 flex min-w-0 flex-1 flex-col overflow-hidden sm:-mx-6">
          <ProfileDecorationBackdrop theme={theme} />
          <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3 px-4 sm:px-6">
            {title ? (
              <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            ) : null}
            <div
              className={
                title
                  ? "mt-4 flex min-w-0 flex-1 flex-col gap-3"
                  : "flex min-w-0 flex-1 flex-col gap-3"
              }
            >
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
