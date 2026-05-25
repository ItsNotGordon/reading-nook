import { NextResponse } from "next/server";
import { fetchOpenLibraryWorkDetails, openLibraryIdToWorkKey } from "@/lib/bookProviders/openLibrary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const catalogTitle = searchParams.get("title")?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ error: "Missing id query parameter." }, { status: 400 });
  }

  if (!openLibraryIdToWorkKey(id)) {
    return NextResponse.json(
      { error: "Work details are only available for openlibrary: book ids." },
      { status: 400 },
    );
  }

  try {
    const details = await fetchOpenLibraryWorkDetails(id, {
      catalogTitle: catalogTitle || undefined,
      context: "work",
    });
    if (!details) {
      return NextResponse.json({ error: "Work not found." }, { status: 404 });
    }
    return NextResponse.json(details);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.warn(`[work] id="${id}" failed: ${msg}`);
    return NextResponse.json(
      { error: "Could not load work details from Open Library." },
      { status: 502 },
    );
  }
}
