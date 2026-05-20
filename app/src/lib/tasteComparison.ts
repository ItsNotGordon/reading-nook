import type { AppState, BookId, SentimentBucket } from "./types";
import { getUserTopGenreRows, topCounts } from "./userTopGenres";

export type SharedRatedBook = {
  bookId: string;
  title: string;
  author: string;
  coverUrl: string;
  yourScore: number | null;
  yourSentiment: SentimentBucket | null;
  friendScore: number | null;
  friendSentiment: SentimentBucket | null;
};

export type TasteComparison = {
  sharedGenres: string[];
  sharedAuthors: string[];
  sharedRatedBooks: SharedRatedBook[];
  sharedLikedTitles: string[];
  yourFinishedCount: number;
  friendFinishedCount: number;
};

function topAuthorLabels(state: AppState, limit: number): string[] {
  const entries: { book: { author: string }; userBook: { shelf: string; sentimentBucket: SentimentBucket | null } }[] =
    [];
  for (const ub of Object.values(state.userBooks)) {
    if (!ub) continue;
    const book = state.catalog[ub.bookId];
    if (!book) continue;
    entries.push({ book, userBook: ub });
  }
  const likedFinished = entries.filter(
    (e) => e.userBook.shelf === "finished" && e.userBook.sentimentBucket === "liked",
  );
  const authorSource =
    likedFinished.length > 0
      ? likedFinished
      : entries.filter((e) => e.userBook.shelf === "finished");
  return topCounts(
    authorSource.map((e) => e.book.author),
    limit,
  ).map((a) => a.label);
}

function buildSharedRatedBooks(yours: AppState, theirs: AppState): SharedRatedBook[] {
  const rows: SharedRatedBook[] = [];
  for (const bookId of Object.keys(yours.userBooks) as BookId[]) {
    const yourUb = yours.userBooks[bookId];
    const theirUb = theirs.userBooks[bookId];
    if (!yourUb || !theirUb) continue;
    if (yourUb.shelf !== "finished" || theirUb.shelf !== "finished") continue;
    if (!yourUb.sentimentBucket || !theirUb.sentimentBucket) continue;

    const book = theirs.catalog[bookId] ?? yours.catalog[bookId];
    if (!book) continue;

    rows.push({
      bookId,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      yourScore: yourUb.derivedScore ?? null,
      yourSentiment: yourUb.sentimentBucket,
      friendScore: theirUb.derivedScore ?? null,
      friendSentiment: theirUb.sentimentBucket,
    });
  }

  rows.sort((a, b) => {
    const aBothLiked = a.yourSentiment === "liked" && a.friendSentiment === "liked" ? 0 : 1;
    const bBothLiked = b.yourSentiment === "liked" && b.friendSentiment === "liked" ? 0 : 1;
    if (aBothLiked !== bBothLiked) return aBothLiked - bBothLiked;
    return a.title.localeCompare(b.title);
  });

  return rows.slice(0, 12);
}

export function buildTasteComparison(yours: AppState, theirs: AppState): TasteComparison {
  const yourGenres = new Set(getUserTopGenreRows(yours, 12).map((g) => g.label));
  const theirGenres = getUserTopGenreRows(theirs, 12).map((g) => g.label);
  const sharedGenres = theirGenres.filter((g) => yourGenres.has(g)).slice(0, 8);

  const yourAuthors = new Set(topAuthorLabels(yours, 8));
  const sharedAuthors = topAuthorLabels(theirs, 8).filter((a) => yourAuthors.has(a)).slice(0, 6);

  const sharedRatedBooks = buildSharedRatedBooks(yours, theirs);

  const yourLiked = new Set(yours.bucketRankings.liked);
  const sharedLikedTitles: string[] = [];
  for (const id of theirs.bucketRankings.liked) {
    if (!yourLiked.has(id)) continue;
    const title = theirs.catalog[id]?.title ?? yours.catalog[id]?.title;
    if (title) sharedLikedTitles.push(title);
    if (sharedLikedTitles.length >= 6) break;
  }

  return {
    sharedGenres,
    sharedAuthors,
    sharedRatedBooks,
    sharedLikedTitles,
    yourFinishedCount: countFinished(yours),
    friendFinishedCount: countFinished(theirs),
  };
}

function countFinished(state: AppState): number {
  let n = 0;
  for (const ub of Object.values(state.userBooks)) {
    if (ub?.shelf === "finished") n += 1;
  }
  return n;
}

export function countShelvedBooks(state: AppState): number {
  return Object.values(state.userBooks).filter(Boolean).length;
}

export function friendShelfCounts(state: AppState): {
  reading: number;
  finished: number;
  want: number;
} {
  let reading = 0;
  let finished = 0;
  let want = 0;
  for (const ub of Object.values(state.userBooks)) {
    if (!ub) continue;
    if (ub.shelf === "reading") reading += 1;
    else if (ub.shelf === "finished") finished += 1;
    else if (ub.shelf === "want_to_read") want += 1;
  }
  return { reading, finished, want };
}
