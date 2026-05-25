"use client";

import { useState } from "react";
import { useReadingNook } from "@/lib/app-state";

export function BlacklistSection() {
  const { state, actions } = useReadingNook();
  const [input, setInput] = useState("");

  const words = state.blacklistedTitleWords;

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    actions.addBlacklistWord(trimmed);
    setInput("");
  }

  return (
    <section className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-[1px]">
      <p className="text-sm font-semibold text-foreground">
        Recommendation blacklist
      </p>
      <p className="mt-1 text-xs text-foreground-muted">
        Books whose titles contain any of these words (case-sensitive) will be
        hidden from recommendations. You can toggle the blacklist on or off on
        the Add tab.
      </p>

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Harry Potter"
          className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-foreground-muted/60 focus:border-accent/50"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-accent bg-accent px-4 text-sm font-semibold text-white shadow-sm disabled:opacity-40"
        >
          Add
        </button>
      </form>

      {words.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {words.map((word) => (
            <li
              key={word}
              className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
            >
              <span>{word}</span>
              <button
                type="button"
                onClick={() => actions.removeBlacklistWord(word)}
                className="text-foreground-muted hover:text-red-500"
                aria-label={`Remove "${word}"`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-foreground-muted">
          No blacklisted words yet.
        </p>
      )}
    </section>
  );
}
