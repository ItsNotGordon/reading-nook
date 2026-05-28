import type { AppState, BookId, UserBook } from "./types";

export const PRIVATE_BOOK_PLACEHOLDER_COVER =
  "https://placehold.co/200x300/f0ece6/7a746d/png?text=Private";

export function isUserBookPrivate(ub: UserBook | null | undefined): boolean {
  return ub?.visibility === "private";
}

export function redactStateForFriendView(state: AppState): AppState {
  const nextCatalog = { ...state.catalog };
  const nextUserBooks = { ...state.userBooks };
  const nextBucketRankings = {
    liked: [...state.bucketRankings.liked],
    okay: [...state.bucketRankings.okay],
    disliked: [...state.bucketRankings.disliked],
  };

  for (const [bookId, maybeUb] of Object.entries(state.userBooks)) {
    const ub = maybeUb;
    if (!ub || ub.visibility !== "private") continue;
    const id = bookId as BookId;
    const cat = state.catalog[id];
    if (!cat) continue;

    nextCatalog[id] = {
      ...cat,
      title: "Private book",
      author: "Hidden",
      coverUrl: PRIVATE_BOOK_PLACEHOLDER_COVER,
      genres: [],
      description: "",
      totalPages: 0,
    };

    nextUserBooks[id] = {
      ...ub,
      notes: "",
      sentimentBucket: null,
      derivedScore: null,
      progressMode: "estimated",
      currentPage: null,
      estimatedRange: null,
    };

    nextBucketRankings.liked = nextBucketRankings.liked.filter((entryId) => entryId !== id);
    nextBucketRankings.okay = nextBucketRankings.okay.filter((entryId) => entryId !== id);
    nextBucketRankings.disliked = nextBucketRankings.disliked.filter((entryId) => entryId !== id);
  }

  return {
    ...state,
    catalog: nextCatalog,
    userBooks: nextUserBooks,
    bucketRankings: nextBucketRankings,
  };
}

