import type { AppState } from "./types";
import { getUserTopGenreRows } from "./userTopGenres";

export type TasteComparison = {
  sharedGenres: string[];
  sharedLikedTitles: string[];
  yourFinishedCount: number;
  friendFinishedCount: number;
};

export function buildTasteComparison(yours: AppState, theirs: AppState): TasteComparison {
  const yourGenres = new Set(getUserTopGenreRows(yours, 12).map((g) => g.label));
  const theirGenres = getUserTopGenreRows(theirs, 12).map((g) => g.label);
  const sharedGenres = theirGenres.filter((g) => yourGenres.has(g)).slice(0, 8);

  const yourLiked = new Set(yours.bucketRankings.liked);
  const sharedLikedTitles: string[] = [];
  for (const id of theirs.bucketRankings.liked) {
    if (!yourLiked.has(id)) continue;
    const title = theirs.catalog[id]?.title ?? yours.catalog[id]?.title;
    if (title) sharedLikedTitles.push(title);
    if (sharedLikedTitles.length >= 6) break;
  }

  const yourFinishedCount = countFinished(yours);
  const friendFinishedCount = countFinished(theirs);

  return {
    sharedGenres,
    sharedLikedTitles,
    yourFinishedCount,
    friendFinishedCount,
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
