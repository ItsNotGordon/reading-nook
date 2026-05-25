import { NextResponse } from "next/server";
import { discoverOpenLibraryByGenre } from "@/lib/bookProviders/openLibrary";
import type { BookSearchResponse } from "@/lib/bookProviders/types";

export const dynamic = "force-dynamic";

const MAX_GENRES = 4;
const PER_GENRE_LIMIT = 40;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("genres")?.trim() ?? "";
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

  const seen = new Set<string>();
  const books = [];
  for (const genre of genreLabels) {
    try {
      const batch = await discoverOpenLibraryByGenre(genre, PER_GENRE_LIMIT, "discover");
      for (const book of batch) {
        if (seen.has(book.id)) continue;
        seen.add(book.id);
        books.push(book);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      console.warn(`[discover] genre="${genre}" failed: ${msg}`);
    }
  }

  const body: BookSearchResponse = {
    provider: "openlibrary",
    books,
  };
  return NextResponse.json(body);
}
