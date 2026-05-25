import { NextResponse } from "next/server";
import {
  fetchGoogleBooksVolumeDetails,
  googleBooksIdToVolumeId,
} from "@/lib/bookProviders/googleBooks";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";

  if (!id) {
    return NextResponse.json({ error: "Missing id query parameter." }, { status: 400 });
  }

  const volumeId = googleBooksIdToVolumeId(id);

  if (!volumeId) {
    return NextResponse.json(
      { error: "Work details require a googlebooks: or openlibrary: book id." },
      { status: 400 },
    );
  }

  try {
    const details = await fetchGoogleBooksVolumeDetails(volumeId, "work");
    if (!details) {
      return NextResponse.json({ error: "Work not found." }, { status: 404 });
    }
    return NextResponse.json(details);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.warn(`[work] id="${id}" failed: ${msg}`);
    return NextResponse.json(
      { error: "Could not load work details from Google Books." },
      { status: 502 },
    );
  }
}
