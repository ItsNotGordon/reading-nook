"use client";

import { useEffect, useId, useRef, useState } from "react";

export type OverflowMenuItem = {
  id: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  hidden?: boolean;
};

type OverflowMenuProps = {
  items: OverflowMenuItem[];
  ariaLabel?: string;
  align?: "left" | "right";
};

export function OverflowMenu({
  items,
  ariaLabel = "More actions",
  align = "right",
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const visibleItems = items.filter((i) => !i.hidden);
  if (visibleItems.length === 0) return null;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-card-surface/80 text-foreground-muted transition-colors hover:bg-accent-soft/15 hover:text-foreground"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="19" cy="12" r="1.75" />
        </svg>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-full z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg ring-1 ring-black/[0.06] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent-soft/10 ${
                item.destructive
                  ? "font-medium text-red-600"
                  : "font-medium text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
