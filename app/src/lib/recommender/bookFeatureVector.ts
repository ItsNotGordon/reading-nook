import { normalizeGenreList } from "@/lib/genreNormalize";
import type { RecPersonalRow } from "@/lib/recPersonalization";
import type { AppState, Book, Shelf } from "@/lib/types";
import { authorKey, genreKey } from "./weightedTaste";

export type SparseVector = Map<string, number>;

export type LibraryVectorRow = {
  bookId: string;
  vector: SparseVector;
  shelf: Shelf;
};

const AUTHOR_TERM_WEIGHT = 1.2;

export function termsForBook(book: Pick<Book, "author" | "genres">): string[] {
  const genres = normalizeGenreList(book.genres ?? []).map(genreKey).filter(Boolean);
  const author = authorKey(book.author);
  return author ? [...genres, `author:${author}`] : genres;
}

export function termsForCandidate(rec: Pick<RecPersonalRow, "author" | "genres">): string[] {
  const genres = normalizeGenreList(rec.genres ?? []).map(genreKey).filter(Boolean);
  const author = authorKey(rec.author);
  return author ? [...genres, `author:${author}`] : genres;
}

export function buildVocabulary(rows: readonly { terms: string[] }[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const term of row.terms) set.add(term);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function vectorFromTerms(terms: string[], vocabulary?: string[]): SparseVector {
  const vec = new Map<string, number>();
  const termSet = new Set(terms);
  if (vocabulary) {
    for (const term of vocabulary) {
      if (termSet.has(term)) {
        vec.set(term, term.startsWith("author:") ? AUTHOR_TERM_WEIGHT : 1);
      }
    }
    return vec;
  }
  for (const term of terms) {
    vec.set(term, term.startsWith("author:") ? AUTHOR_TERM_WEIGHT : 1);
  }
  return vec;
}

export function vectorForCandidate(rec: RecPersonalRow, vocabulary: string[]): SparseVector {
  return vectorFromTerms(termsForCandidate(rec), vocabulary);
}

/** Non-DNF shelved books as sparse genre/author vectors. */
export function buildLibraryVectors(state: AppState): LibraryVectorRow[] {
  const rows: { bookId: string; terms: string[]; shelf: Shelf }[] = [];
  for (const ub of Object.values(state.userBooks)) {
    if (!ub || ub.shelf === "did_not_finish") continue;
    const book = state.catalog[ub.bookId];
    if (!book) continue;
    rows.push({
      bookId: ub.bookId,
      terms: termsForBook(book),
      shelf: ub.shelf,
    });
  }
  const vocabulary = buildVocabulary(rows);
  return rows.map((row) => ({
    bookId: row.bookId,
    shelf: row.shelf,
    vector: vectorFromTerms(row.terms, vocabulary),
  }));
}

export function cosineSimilarity(a: SparseVector, b: SparseVector): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const key of keys) {
    const av = a.get(key) ?? 0;
    const bv = b.get(key) ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function cosineDistance(a: SparseVector, b: SparseVector): number {
  return 1 - cosineSimilarity(a, b);
}

export function centroid(vectors: SparseVector[]): SparseVector {
  if (vectors.length === 0) return new Map();
  const sums = new Map<string, number>();
  for (const vec of vectors) {
    for (const [term, weight] of vec) {
      sums.set(term, (sums.get(term) ?? 0) + weight);
    }
  }
  const n = vectors.length;
  const out = new Map<string, number>();
  for (const [term, sum] of sums) {
    out.set(term, sum / n);
  }
  return out;
}
