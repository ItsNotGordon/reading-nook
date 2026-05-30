"use client";

import { AddToShelfSheet } from "@/components/AddToShelfSheet";
import type { Book, Shelf } from "@/lib/types";
import { shelfDisplayName } from "@/lib/shelves";

export { shelfDisplayName };

export const SHELF_CHOICES: { shelf: Shelf; title: string; subtitle: string }[] = [
  {
    shelf: "reading",
    title: "Currently Reading",
    subtitle: "On your nightstand",
  },
  {
    shelf: "finished",
    title: "Finished",
    subtitle: "Done for now",
  },
  {
    shelf: "want_to_read",
    title: "Want to Read",
    subtitle: "Save for later",
  },
  {
    shelf: "did_not_finish",
    title: "Did Not Finish",
    subtitle: "Stopped partway",
  },
];

type ShelfPickerSheetProps = {
  book: Book | null;
  onClose: () => void;
  onChooseShelf: (shelf: Shelf, genres: string[], visibility: "public" | "private") => void;
  initialVisibility?: "public" | "private";
  initialShelf?: Shelf | null;
};

export function ShelfPickerSheet({
  book,
  onClose,
  onChooseShelf,
  initialVisibility = "public",
  initialShelf = null,
}: ShelfPickerSheetProps) {
  return (
    <AddToShelfSheet
      key={book ? `shelf-picker:${book.id}:${initialVisibility}:${initialShelf ?? "none"}` : "shelf-picker:closed"}
      open={Boolean(book)}
      book={book}
      onClose={onClose}
      onChooseShelf={onChooseShelf}
      initialVisibility={initialVisibility}
      initialShelf={initialShelf}
    />
  );
}
