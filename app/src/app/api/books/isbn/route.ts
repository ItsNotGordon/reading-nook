import { NextResponse } from "next/server";
import { lookupByIsbn } from "@/lib/bookProviders/openLibrary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isbn = searchParams.get("isbn")?.trim() ?? "";

  if (!isbn || (isbn.length !== 10 && isbn.length !== 13)) {
    return NextResponse.json({ error: "Invalid ISBN." }, { status: 400 });
  }

  try {
    const book = await lookupByIsbn(isbn);
    return NextResponse.json({ book });
  } catch {
    return NextResponse.json({ book: null });
  }
}
