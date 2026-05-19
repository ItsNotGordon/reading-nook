import type { AppState, BookId } from "./types";

/** Minimal row shape for personalization (matches Recommendation without importing the hook module). */
export type RecPersonalRow = {
  bookId: BookId;
  author: string;
  genres: string[];
  score: number;
  reason: string;
  title: string;
  coverUrl: string;
  source: string;
  rawScore?: number;
  rawKind?: string;
  readinglogCount?: number;
  ratingsCount?: number;
};

const NEUTRAL_FIT = 5;
const PENALTY_DISLIKED_AUTHOR = 4;
const PENALTY_DISLIKED_GENRE_EACH = 1.5;
const BOOST_LIKED_AUTHOR = 2;
const BOOST_LIKED_GENRE_EACH = 1.2;
const BOOST_OKAY_GENRE_EACH = 0.6;
const FIT_MIN = 0.5;
const FIT_MAX = 10;

export type TasteSignals = {
  /** True when at least one finished book has a non-null sentiment (taste signal exists). */
  active: boolean;
  dislikedAuthors: Set<string>;
  likedAuthors: Set<string>;
  likedGenreKeys: Set<string>;
  okayGenreKeys: Set<string>;
  dislikedGenreKeys: Set<string>;
};

function authorKey(author: string): string {
  return author.trim().toLowerCase();
}

function genreKey(g: string): string {
  return g.trim().toLowerCase();
}

export function buildTasteSignals(state: AppState): TasteSignals {
  const dislikedAuthors = new Set<string>();
  const likedAuthors = new Set<string>();
  const likedGenreKeys = new Set<string>();
  const okayGenreKeys = new Set<string>();
  const dislikedGenreKeys = new Set<string>();

  let finishedWithSentiment = 0;

  for (const ub of Object.values(state.userBooks)) {
    if (!ub || ub.shelf !== "finished") continue;
    const book = state.catalog[ub.bookId];
    if (!book) continue;
    const bucket = ub.sentimentBucket;
    if (bucket === null || bucket === undefined) continue;
    finishedWithSentiment += 1;

    const a = authorKey(book.author);
    if (bucket === "disliked") {
      if (a) dislikedAuthors.add(a);
    } else if (bucket === "liked") {
      if (a) likedAuthors.add(a);
    }

    for (const raw of book.genres ?? []) {
      const k = genreKey(raw);
      if (!k) continue;
      if (bucket === "disliked") dislikedGenreKeys.add(k);
      else if (bucket === "liked") likedGenreKeys.add(k);
      else if (bucket === "okay") okayGenreKeys.add(k);
    }
  }

  const active = finishedWithSentiment > 0;

  return {
    active,
    dislikedAuthors,
    likedAuthors,
    likedGenreKeys,
    okayGenreKeys,
    dislikedGenreKeys,
  };
}

function roundFit(n: number): number {
  return Math.round(Math.min(FIT_MAX, Math.max(FIT_MIN, n)) * 10) / 10;
}

export function scoreRecommendationPersonal<T extends RecPersonalRow>(
  rec: T,
  signals: TasteSignals,
): { fit: number; blurb: string } {
  if (!signals.active) {
    return { fit: rec.score, blurb: rec.reason };
  }

  let fit = NEUTRAL_FIT;
  const a = authorKey(rec.author);
  const recGenres = rec.genres.map(genreKey).filter(Boolean);

  let overlapLiked = 0;
  let overlapOkay = 0;
  let overlapDisliked = 0;
  for (const g of recGenres) {
    if (signals.dislikedGenreKeys.has(g)) overlapDisliked += 1;
    if (signals.likedGenreKeys.has(g)) overlapLiked += 1;
    if (signals.okayGenreKeys.has(g)) overlapOkay += 1;
  }

  if (a && signals.dislikedAuthors.has(a)) {
    fit -= PENALTY_DISLIKED_AUTHOR;
  }
  if (a && signals.likedAuthors.has(a)) {
    fit += BOOST_LIKED_AUTHOR;
  }

  fit += overlapLiked * BOOST_LIKED_GENRE_EACH;
  fit += overlapOkay * BOOST_OKAY_GENRE_EACH;
  fit -= overlapDisliked * PENALTY_DISLIKED_GENRE_EACH;

  fit = roundFit(fit);

  let blurb = "Neutral for your taste so far.";
  if (a && signals.dislikedAuthors.has(a)) {
    blurb = "Same author as a book you didn't like.";
  } else if (overlapDisliked > 0) {
    blurb = "Overlaps genres from books you didn't like.";
  } else if (overlapLiked > 0) {
    blurb = "Similar genres to books you liked.";
  } else if (overlapOkay > 0) {
    blurb = "Some overlap with books that were okay for you.";
  } else if (a && signals.likedAuthors.has(a)) {
    blurb = "Author you've enjoyed before.";
  }

  return { fit, blurb };
}

/**
 * Re-rank and relabel rec rows using taste signals. If there is no taste signal, returns the same
 * array reference and order unchanged.
 */
export function sortRecommendationsPersonal<T extends RecPersonalRow>(recs: T[], state: AppState): T[] {
  const signals = buildTasteSignals(state);
  if (!signals.active || recs.length === 0) {
    return recs;
  }

  const scored = recs.map((rec) => {
    const { fit, blurb } = scoreRecommendationPersonal(rec, signals);
    return { rec, fit, blurb };
  });

  scored.sort((x, y) => {
    if (y.fit !== x.fit) return y.fit - x.fit;
    return x.rec.bookId.localeCompare(y.rec.bookId);
  });

  return scored.map(({ rec, fit, blurb }) => ({ ...rec, score: fit, reason: blurb }));
}
