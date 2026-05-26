import { NextResponse } from "next/server";
import { discoverGoogleBooksByGenre } from "@/lib/bookProviders/googleBooks";
import type { BookSearchResponse } from "@/lib/bookProviders/types";

export const dynamic = "force-dynamic";

const MAX_GENRES = 4;
const PER_GENRE_LIMIT = 40;
/** Each "page" fetches 2 batches of 40 per genre (80 books per genre per page). */
const BATCHES_PER_PAGE = 2;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("genres")?.trim() ?? "";
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10) || 0);
  const genreLabels = raw
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, MAX_GENRES);

  if (genreLabels.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one genre via genres= query param." },
      { status: 400 },
    );
  }

  const baseOffset = page * BATCHES_PER_PAGE * PER_GENRE_LIMIT;
  const seen = new Set<string>();
  const books = [];
  for (const genre of genreLabels) {
    for (let batch = 0; batch < BATCHES_PER_PAGE; batch++) {
      const startIndex = baseOffset + batch * PER_GENRE_LIMIT;
      try {
        const results = await discoverGoogleBooksByGenre(
          genre,
          PER_GENRE_LIMIT,
          "discover",
          startIndex,
        );
        for (const book of results) {
          if (seen.has(book.id)) continue;
          seen.add(book.id);
          books.push(book);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        console.warn(`[discover] genre="${genre}" batch=${batch} failed: ${msg}`);
      }
    }
  }

  const body: BookSearchResponse = {
    provider: "googlebooks",
    books,
  };
  return NextResponse.json(body);
}
