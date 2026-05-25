const OL_HEADERS: HeadersInit = {
  "User-Agent":
    "ReadingNook/1.0 (https://reading-nook-beta.vercel.app; contact: gordon.tran01@student.csulb.edu)",
  Accept: "application/json",
};

/** Shared fetch for all Open Library requests -- attaches User-Agent and logs failures. */
export async function olFetch(url: string, context = "ol"): Promise<Response> {
  const res = await fetch(url, { cache: "no-store", headers: OL_HEADERS });
  if (!res.ok) {
    const parsed = URL.canParse(url) ? new URL(url) : null;
    const safe = parsed ? `${parsed.pathname}${parsed.search}` : url;
    console.warn(`[OL:${context}] ${safe} -> ${res.status}`);
  }
  return res;
}
