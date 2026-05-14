type PageShellProps = {
  children: React.ReactNode;
  title?: string;
};

/** Scrollable main column with space reserved for the fixed bottom nav + safe area. */
export function PageShell({ children, title }: PageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]">
        {title ? (
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        ) : null}
        <div className={title ? "mt-4 flex min-w-0 flex-1 flex-col gap-3" : "flex min-w-0 flex-1 flex-col gap-3"}>
          {children}
        </div>
      </main>
    </div>
  );
}
