import type { AppState, Shelf } from "./types";

export type FriendShelfBook = {
  id: string;
  title: string;
  coverUrl: string;
  shelf: Shelf;
};

const SHELF_ORDER: Shelf[] = ["reading", "finished", "want_to_read"];

export function listFriendShelfBooks(state: AppState): FriendShelfBook[] {
  const out: FriendShelfBook[] = [];
  for (const [id, ub] of Object.entries(state.userBooks)) {
    if (!ub) continue;
    const book = state.catalog[id as keyof typeof state.catalog];
    if (!book) continue;
    out.push({
      id,
      title: book.title,
      coverUrl: book.coverUrl,
      shelf: ub.shelf,
    });
  }
  out.sort((a, b) => {
    const shelfDiff = SHELF_ORDER.indexOf(a.shelf) - SHELF_ORDER.indexOf(b.shelf);
    if (shelfDiff !== 0) return shelfDiff;
    return a.title.localeCompare(b.title);
  });
  return out;
}

export function groupFriendShelfBooks(books: FriendShelfBook[]): Record<Shelf, FriendShelfBook[]> {
  return {
    reading: books.filter((b) => b.shelf === "reading"),
    finished: books.filter((b) => b.shelf === "finished"),
    want_to_read: books.filter((b) => b.shelf === "want_to_read"),
  };
}
