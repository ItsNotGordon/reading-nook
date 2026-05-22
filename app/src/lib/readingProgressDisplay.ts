import type { Book, ProgressMode, UserBook } from "./types";
import {
  estimatedQualitativeLabel,
  estimatedRangeMidpoint,
  formatEstimatedPercentRange,
  formatExactProgressLines,
  userBookShowsProgress,
} from "./progress";

export type ReadingProgressDisplay = {
  mode: ProgressMode;
  barValue: number;
  estimatedBand?: [number, number];
  line1: string;
  line2: string | null;
};

export function readingProgressDisplay(
  totalPages: number,
  progressMode: ProgressMode,
  currentPage: number | null,
  estimatedRange: [number, number] | null,
): ReadingProgressDisplay | null {
  const ub = {
    progressMode,
    currentPage,
    estimatedRange,
  } as Pick<UserBook, "progressMode" | "currentPage" | "estimatedRange">;

  if (!userBookShowsProgress(ub as UserBook)) return null;

  if (progressMode === "exact") {
    if (totalPages <= 0 || currentPage === null) return null;
    const total = Math.max(1, totalPages);
    const page = Math.min(total, Math.max(0, Math.floor(currentPage)));
    const { pagesLine, pctLine } = formatExactProgressLines(page, totalPages);
    return {
      mode: "exact",
      barValue: page / total,
      line1: pagesLine,
      line2: pctLine,
    };
  }

  if (!estimatedRange) return null;
  const [lo, hi] = estimatedRange;
  const mid = estimatedRangeMidpoint([lo, hi]);
  return {
    mode: "estimated",
    barValue: mid,
    estimatedBand: [lo, hi],
    line1: formatEstimatedPercentRange([lo, hi]),
    line2: estimatedQualitativeLabel([lo, hi]),
  };
}

export function readingProgressDisplayFromBook(book: Book, userBook: UserBook): ReadingProgressDisplay | null {
  return readingProgressDisplay(
    book.totalPages,
    userBook.progressMode,
    userBook.currentPage,
    userBook.estimatedRange,
  );
}
