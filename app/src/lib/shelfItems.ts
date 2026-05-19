import type { Book, BookId, Shelf, UserBook } from "./types";

export type ShelfItem = { book: Book; userBook: UserBook };

/**
 * Books on a shelf with catalog entries, sorted for display.
 * Finished: newest finish first; other shelves: newest added first.
 */
export function itemsForShelf(
  userBooks: Partial<Record<BookId, UserBook>>,
  catalog: Record<BookId, Book>,
  shelf: Shelf,
): ShelfItem[] {
  const out: ShelfItem[] = [];
  for (const ub of Object.values(userBooks)) {
    if (!ub || ub.shelf !== shelf) continue;
    const book = catalog[ub.bookId];
    if (book) out.push({ book, userBook: ub });
  }
  if (shelf === "finished") {
    out.sort((a, b) => {
      const aRaw = a.userBook.finishedSortAt ?? a.userBook.finishedAt ?? a.userBook.addedAt;
      const bRaw = b.userBook.finishedSortAt ?? b.userBook.finishedAt ?? b.userBook.addedAt;
      const aTs = Number.isFinite(Date.parse(aRaw)) ? Date.parse(aRaw) : -Infinity;
      const bTs = Number.isFinite(Date.parse(bRaw)) ? Date.parse(bRaw) : -Infinity;
      if (bTs !== aTs) return bTs - aTs;
      const aAddedTs = Number.isFinite(Date.parse(a.userBook.addedAt))
        ? Date.parse(a.userBook.addedAt)
        : -Infinity;
      const bAddedTs = Number.isFinite(Date.parse(b.userBook.addedAt))
        ? Date.parse(b.userBook.addedAt)
        : -Infinity;
      if (bAddedTs !== aAddedTs) return bAddedTs - aAddedTs;
      return b.userBook.bookId.localeCompare(a.userBook.bookId);
    });
  } else {
    out.sort((a, b) => {
      const aTs = Number.isFinite(Date.parse(a.userBook.addedAt))
        ? Date.parse(a.userBook.addedAt)
        : -Infinity;
      const bTs = Number.isFinite(Date.parse(b.userBook.addedAt))
        ? Date.parse(b.userBook.addedAt)
        : -Infinity;
      if (bTs !== aTs) return bTs - aTs;
      return b.userBook.bookId.localeCompare(a.userBook.bookId);
    });
  }
  return out;
}
