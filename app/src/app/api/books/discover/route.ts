import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { discoverGoogleBooksByGenre } from "@/lib/bookProviders/googleBooks";
import { getSupabaseUrl, getSupabaseServiceRoleKey, isSupabaseConfigured } from "@/lib/supabase/config";
import type { BookSearchResponse, SearchBookResult } from "@/lib/bookProviders/types";

export const dynamic = "force-dynamic";

const MAX_GENRES = 2;
const PER_GENRE_LIMIT = 40;
const BATCHES_PER_PAGE = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
  } catch {
    return null;
  }
}

async function getCached(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  genre: string,
  page: number,
): Promise<SearchBookResult[] | null> {
  const { data } = await sb
    .from("discover_cache")
    .select("results, fetched_at")
    .eq("genre", genre)
    .eq("page", page)
    .single();

  if (!data) return null;

  const row = data as { results: unknown; fetched_at: string };
  const age = Date.now() - new Date(row.fetched_at).getTime();
  if (age > CACHE_TTL_MS) return null;

  return row.results as SearchBookResult[];
}

async function setCache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  genre: string,
  page: number,
  results: SearchBookResult[],
) {
  await sb.from("discover_cache").upsert(
    { genre, page, results, fetched_at: new Date().toISOString() },
    { onConflict: "genre,page" },
  );
}

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

  const sb = getServiceClient();
  const seen = new Set<string>();
  const books: SearchBookResult[] = [];
  let rateLimited = false;

  for (const genre of genreLabels) {
    // Try cache first
    if (sb) {
      try {
        const cached = await getCached(sb, genre, page);
        if (cached) {
          console.log(`[discover] cache HIT genre="${genre}" page=${page} (${cached.length} books)`);
          for (const book of cached) {
            if (seen.has(book.id)) continue;
            seen.add(book.id);
            books.push(book);
          }
          continue; // skip live fetch for this genre
        }
      } catch (err) {
        console.warn(`[discover] cache read error for genre="${genre}":`, err);
      }
    }

    // Cache miss — fetch from Google Books
    const genreBooks: SearchBookResult[] = [];
    let hitRateLimit = false;
    const baseOffset = page * BATCHES_PER_PAGE * PER_GENRE_LIMIT;
    for (let batch = 0; batch < BATCHES_PER_PAGE; batch++) {
      const startIndex = baseOffset + batch * PER_GENRE_LIMIT;
      try {
        const results = await discoverGoogleBooksByGenre(
          genre,
          PER_GENRE_LIMIT,
          "discover",
          startIndex,
        );
        genreBooks.push(...results);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("429")) hitRateLimit = true;
        console.warn(`[discover] genre="${genre}" batch=${batch} failed: ${msg}`);
      }
    }

    if (hitRateLimit && genreBooks.length === 0) {
      rateLimited = true;
    }

    // Store in cache
    if (sb && genreBooks.length > 0) {
      try {
        await setCache(sb, genre, page, genreBooks);
        console.log(`[discover] cached genre="${genre}" page=${page} (${genreBooks.length} books)`);
      } catch (err) {
        console.warn(`[discover] cache write error for genre="${genre}":`, err);
      }
    }

    for (const book of genreBooks) {
      if (seen.has(book.id)) continue;
      seen.add(book.id);
      books.push(book);
    }
  }

  // If every genre was rate-limited and we got zero books, tell the client
  if (rateLimited && books.length === 0) {
    return NextResponse.json(
      { provider: "googlebooks", books: [], rateLimited: true },
      { status: 429 },
    );
  }

  const body: BookSearchResponse = {
    provider: "googlebooks",
    books,
  };
  return NextResponse.json(body);
}
