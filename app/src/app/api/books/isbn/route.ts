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
    const book = await lookupByIsbn(isbn, "isbn");
    return NextResponse.json({ book });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    console.warn(`[isbn] isbn="${isbn}" failed: ${msg}`);
    return NextResponse.json({ book: null });
  }
}
