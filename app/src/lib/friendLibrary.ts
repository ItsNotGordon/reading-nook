import type { AppState, ProgressMode, Shelf } from "./types";

export type FriendShelfBook = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  genres: string[];
  readinglogCount?: number;
  shelf: Shelf;
  finishedAt: string | null;
  notes: string;
  /** Present for Currently Reading rows. */
  progressMode?: ProgressMode;
  currentPage?: number | null;
  estimatedRange?: [number, number] | null;
  totalPages?: number;
};

const SHELF_ORDER: Shelf[] = ["reading", "finished", "want_to_read", "did_not_finish"];

export function listFriendShelfBooks(state: AppState): FriendShelfBook[] {
  const out: FriendShelfBook[] = [];
  for (const [id, ub] of Object.entries(state.userBooks)) {
    if (!ub) continue;
    const book = state.catalog[id as keyof typeof state.catalog];
    if (!book) continue;
    const row: FriendShelfBook = {
      id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      genres: book.genres ?? [],
      readinglogCount: book.readinglogCount,
      shelf: ub.shelf,
      finishedAt: ub.finishedAt,
      notes: ub.notes ?? "",
    };
    if (ub.shelf === "reading") {
      row.progressMode = ub.progressMode;
      row.currentPage = ub.currentPage;
      row.estimatedRange = ub.estimatedRange;
      row.totalPages = book.totalPages;
    }
    out.push(row);
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
    did_not_finish: books.filter((b) => b.shelf === "did_not_finish"),
  };
}
