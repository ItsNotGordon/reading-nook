"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ThemedPageShell } from "@/components/ThemedPageShell";
import { BookPickerSheet } from "@/components/BookPickerSheet";
import { createClub } from "@/lib/clubClient";
import type { Book } from "@/lib/types";

export default function CreateClubPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const n = name.trim();
    if (!n || creating) return;
    setCreating(true);
    const result = await createClub({
      name: n,
      description: description.trim(),
      isPublic,
      currentBook: currentBook
        ? { id: currentBook.id, title: currentBook.title, author: currentBook.author, coverUrl: currentBook.coverUrl }
        : undefined,
    });
    setCreating(false);
    if (result.ok && result.clubId) {
      router.push(`/clubs/${result.clubId}`);
    }
  }

  return (
    <ThemedPageShell title="Create Club">
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-card-surface/95 p-4 shadow-sm ring-1 ring-black/[0.03]">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-foreground-muted">Club Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Page Turners"
              maxLength={60}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Description */}
          <div className="mt-3">
            <label className="text-xs font-semibold text-foreground-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your club about?"
              rows={3}
              maxLength={300}
              className="mt-1 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Privacy toggle */}
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Public Club</p>
              <p className="text-[10px] text-foreground-muted">Anyone can discover and join</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${isPublic ? "bg-accent" : "bg-foreground-muted/30"}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isPublic ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>

          {/* Current book */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-foreground-muted">
              Current Book (optional)
            </label>
            {currentBook ? (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-accent-soft/10 px-2.5 py-1.5">
                {currentBook.coverUrl ? (
                  <Image
                    src={currentBook.coverUrl}
                    alt=""
                    width={24}
                    height={36}
                    className="h-[36px] w-[24px] shrink-0 rounded object-cover"
                    unoptimized
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{currentBook.title}</p>
                  <p className="truncate text-[10px] text-foreground-muted">{currentBook.author}</p>
                </div>
                <button
                  onClick={() => setCurrentBook(null)}
                  className="shrink-0 text-xs text-foreground-muted"
                >
                  &times;
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPickerOpen(true)}
                className="mt-1.5 text-xs font-medium text-accent"
              >
                Pick a book
              </button>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="w-full rounded-2xl border border-accent bg-accent py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 active:opacity-90"
        >
          {creating ? "Creating..." : "Create Club"}
        </button>

        <button
          onClick={() => router.back()}
          className="text-center text-xs font-medium text-foreground-muted"
        >
          Cancel
        </button>
      </div>

      <BookPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(book) => setCurrentBook(book)}
      />
    </ThemedPageShell>
  );
}
