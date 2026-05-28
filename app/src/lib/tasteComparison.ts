import type { AppState, Book, BookId, SentimentBucket, UserBook } from "./types";
import { getBookMatchKey } from "./bookIdentity";
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

type RatedEntry = {
  bookId: BookId;
  book: Book;
  ub: UserBook;
};

function preferBookId(a: BookId, b: BookId): BookId {
  const score = (id: BookId): number => {
    if (id.startsWith("googlebooks:")) return 3;
    if (id.startsWith("openlibrary:")) return 2;
    if (id.startsWith("goodreads-import:")) return 1;
    return 0;
  };
  return score(a) >= score(b) ? a : b;
}

function pickDisplayBook(a: Book, b: Book): Book {
  const coverScore = (book: Book): number => {
    const url = book.coverUrl?.trim() ?? "";
    if (!url || url.includes("placehold.co")) return 0;
    return 1;
  };
  if (coverScore(a) !== coverScore(b)) {
    return coverScore(a) > coverScore(b) ? a : b;
  }
  return a.title.length >= b.title.length ? a : b;
}

/** Index finished rated books by canonical match key (not raw bookId). */
function indexFinishedRated(state: AppState): Map<string, RatedEntry> {
  const map = new Map<string, RatedEntry>();

  for (const [bookId, ub] of Object.entries(state.userBooks)) {
    if (!ub || ub.shelf !== "finished" || !ub.sentimentBucket) continue;
    const book = state.catalog[bookId];
    if (!book) continue;

    const key = getBookMatchKey(book, bookId);
    if (!key) continue;

    const prev = map.get(key);
    if (!prev) {
      map.set(key, { bookId, book, ub });
      continue;
    }

    const nextBookId = preferBookId(prev.bookId, bookId);
    const nextBook =
      nextBookId === bookId
        ? pickDisplayBook(book, prev.book)
        : pickDisplayBook(prev.book, book);
    map.set(key, {
      bookId: nextBookId,
      book: nextBook,
      ub: nextBookId === bookId ? ub : prev.ub,
    });
  }

  return map;
}

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
  const theirByKey = indexFinishedRated(theirs);
  const rows: SharedRatedBook[] = [];

  for (const { bookId, book, ub: yourUb } of indexFinishedRated(yours).values()) {
    const key = getBookMatchKey(book, bookId);
    if (!key) continue;
    const theirEntry = theirByKey.get(key);
    if (!theirEntry) continue;

    const display = pickDisplayBook(book, theirEntry.book);

    rows.push({
      bookId: display.id,
      title: display.title,
      author: display.author,
      coverUrl: display.coverUrl,
      yourScore: yourUb.derivedScore ?? null,
      yourSentiment: yourUb.sentimentBucket,
      friendScore: theirEntry.ub.derivedScore ?? null,
      friendSentiment: theirEntry.ub.sentimentBucket,
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

function buildSharedLikedTitles(yours: AppState, theirs: AppState): string[] {
  const yourLikedKeys = new Set<string>();
  for (const id of yours.bucketRankings.liked) {
    const book = yours.catalog[id];
    const key = getBookMatchKey(book, id);
    if (key) yourLikedKeys.add(key);
  }

  const sharedLikedTitles: string[] = [];
  for (const id of theirs.bucketRankings.liked) {
    const book = theirs.catalog[id];
    const key = getBookMatchKey(book, id);
    if (!key || !yourLikedKeys.has(key)) continue;
    const title = book?.title ?? yours.catalog[id]?.title;
    if (title) sharedLikedTitles.push(title);
    if (sharedLikedTitles.length >= 6) break;
  }
  return sharedLikedTitles;
}

export function buildTasteComparison(yours: AppState, theirs: AppState): TasteComparison {
  const yourGenres = new Set(getUserTopGenreRows(yours, 12).map((g) => g.label));
  const theirGenres = getUserTopGenreRows(theirs, 12).map((g) => g.label);
  const sharedGenres = theirGenres.filter((g) => yourGenres.has(g)).slice(0, 8);

  const yourAuthors = new Set(topAuthorLabels(yours, 8));
  const sharedAuthors = topAuthorLabels(theirs, 8).filter((a) => yourAuthors.has(a)).slice(0, 6);

  return {
    sharedGenres,
    sharedAuthors,
    sharedRatedBooks: buildSharedRatedBooks(yours, theirs),
    sharedLikedTitles: buildSharedLikedTitles(yours, theirs),
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
