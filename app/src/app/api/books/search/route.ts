import { NextResponse } from "next/server";
import { searchOpenLibraryBooks } from "@/lib/bookProviders/openLibrary";
import type { BookSearchResponse } from "@/lib/bookProviders/types";

export const dynamic = "force-dynamic";

const SEARCH_LIMIT = 20;
const MIN_QUERY_LENGTH = 2;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters." },
      { status: 400 },
    );
  }

  try {
    const books = await searchOpenLibraryBooks(q, SEARCH_LIMIT, "search");
    const body: BookSearchResponse = {
      provider: "openlibrary",
      books: books.slice(0, SEARCH_LIMIT),
    };
    return NextResponse.json(body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.warn(`[search] q="${q}" failed: ${msg}`);
    const body: BookSearchResponse = { provider: "openlibrary", books: [] };
    return NextResponse.json(body);
  }
}
