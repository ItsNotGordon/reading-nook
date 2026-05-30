import type { Shelf, UserBook } from "./types";

/** Library page section order. */
export const LIBRARY_SHELF_ORDER: Shelf[] = [
  "reading",
  "finished",
  "want_to_read",
  "did_not_finish",
];

const DISPLAY_NAMES: Record<Shelf, string> = {
  reading: "Currently Reading",
  finished: "Finished",
  want_to_read: "Want to Read",
  did_not_finish: "Did Not Finish",
};

export function shelfDisplayName(shelf: Shelf): string {
  return DISPLAY_NAMES[shelf];
}

/** Tight UI label (e.g. book cards). */
export function shelfShortLabel(shelf: Shelf): string {
  return shelf === "did_not_finish" ? "DNF" : shelfDisplayName(shelf);
}

export function isFinishedShelf(shelf: Shelf): boolean {
  return shelf === "finished";
}

/** Shelves shown as primary choices when adding a book. */
export const PRIMARY_ADD_SHELVES: Shelf[] = ["want_to_read", "reading", "finished"];

export function moveShelfTargets(current: Shelf): Shelf[] {
  return LIBRARY_SHELF_ORDER.filter((s) => s !== current);
}

/** Strip post-read metadata when leaving Finished (or normalizing DNF). */
export function withoutFinishedMetadata(
  ub: UserBook,
  shelf: Shelf,
): Pick<
  UserBook,
  "shelf" | "finishedAt" | "finishedSortAt" | "sentimentBucket" | "derivedScore"
> {
  if (shelf === "finished") {
    return {
      shelf,
      finishedAt: ub.finishedAt,
      finishedSortAt: ub.finishedSortAt,
      sentimentBucket: ub.sentimentBucket,
      derivedScore: ub.derivedScore,
    };
  }
  return {
    shelf,
    finishedAt: null,
    finishedSortAt: null,
    sentimentBucket: null,
    derivedScore: null,
  };
}
