import { openLibraryIdToWorkKey } from "./openLibraryIds";

const OPEN_LIBRARY_WORKS_BASE = "https://openlibrary.org/works";

/** Latin-1 supplement + common extended letters used in European translations. */
const ACCENTED_LATIN_RE =
  /[àâäáãåæçèéêëìíîïñòóôõöùúûüýÿœÀÂÄÁÃÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŒ]/;

const NON_ENGLISH_ARTICLE_RE =
  /^(Una|Un|El|La|Los|Las|Le|Les|Une|Der|Die|Das|Den|Dem|Des|Ein|Eine|Einen|Il|Lo|Gli|I|L|De|Het|Een)\s/i;

const ENGLISH_EDITION_LANG = "/languages/eng";

const titleResolutionCache = new Map<string, string>();

type EditionLanguage = { key?: string };
type EditionEntry = {
  title?: string;
  languages?: EditionLanguage[];
  translation_of?: string;
  other_titles?: string | string[];
};

type EditionsPayload = {
  size?: number;
  entries?: EditionEntry[];
  links?: { next?: string };
};

function trimTitle(value: string): string {
  return value.trim();
}

/** True when OL search title likely needs English edition lookup. */
export function looksNonEnglishTitle(title: string): boolean {
  const t = trimTitle(title);
  if (!t) return false;

  if (ACCENTED_LATIN_RE.test(t)) return true;
  if (NON_ENGLISH_ARTICLE_RE.test(t)) return true;

  const letters = t.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return false;
  const basicLatin = letters.filter((ch) => /^[A-Za-z]$/.test(ch)).length;
  if (basicLatin / letters.length < 0.85) return true;

  return false;
}

function hasEnglishLanguage(languages: EditionLanguage[] | undefined): boolean {
  if (!Array.isArray(languages)) return false;
  return languages.some((l) => l?.key === ENGLISH_EDITION_LANG);
}

function titleFromOtherTitles(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const parts = Array.isArray(raw) ? raw : [raw];
  for (const item of parts) {
    const text = trimTitle(item);
    if (!text) continue;
    const slash = text.split("/").map((s) => trimTitle(s));
    for (const seg of slash) {
      if (seg && !looksNonEnglishTitle(seg)) return seg;
    }
    const paren = text.match(/\(([^)]+)\)/);
    if (paren?.[1] && !looksNonEnglishTitle(paren[1])) return trimTitle(paren[1]);
  }
  return null;
}

function pickEnglishTitleFromEntries(entries: EditionEntry[]): string | null {
  for (const entry of entries) {
    const title = typeof entry.title === "string" ? trimTitle(entry.title) : "";
    if (title && hasEnglishLanguage(entry.languages) && !looksNonEnglishTitle(title)) {
      return title;
    }
  }

  for (const entry of entries) {
    const translationOf =
      typeof entry.translation_of === "string" ? trimTitle(entry.translation_of) : "";
    if (translationOf && !looksNonEnglishTitle(translationOf)) {
      return translationOf;
    }
  }

  for (const entry of entries) {
    const fromOther = titleFromOtherTitles(entry.other_titles);
    if (fromOther) return fromOther;
  }

  return null;
}

async function fetchEditionsPage(workKey: string, offset = 0): Promise<EditionsPayload> {
  const url = `${OPEN_LIBRARY_WORKS_BASE}/${workKey}/editions.json?limit=30&offset=${offset}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Open Library editions HTTP ${res.status}`);
  }
  return (await res.json()) as EditionsPayload;
}

async function loadEditionEntries(workKey: string): Promise<EditionEntry[]> {
  const first = await fetchEditionsPage(workKey, 0);
  const entries = [...(first.entries ?? [])];
  const total = typeof first.size === "number" ? first.size : entries.length;
  if (entries.length < total && first.links?.next) {
    const second = await fetchEditionsPage(workKey, 30);
    entries.push(...(second.entries ?? []));
  }
  return entries;
}

/**
 * Resolve a display title from English editions when the search title looks translated.
 */
export async function resolveEnglishDisplayTitle(
  bookId: string,
  fallbackTitle: string,
): Promise<string> {
  const fallback = trimTitle(fallbackTitle);
  if (!fallback || !looksNonEnglishTitle(fallback)) return fallback;

  const cached = titleResolutionCache.get(bookId);
  if (cached) return cached;

  const workKey = openLibraryIdToWorkKey(bookId);
  if (!workKey) return fallback;

  try {
    const entries = await loadEditionEntries(workKey);
    const resolved = pickEnglishTitleFromEntries(entries) ?? fallback;
    titleResolutionCache.set(bookId, resolved);
    return resolved;
  } catch {
    return fallback;
  }
}

/** Append Open Library language filter for English editions. */
export function withEnglishLanguageQuery(q: string): string {
  const trimmed = q.trim();
  if (!trimmed) return "language:eng";
  if (/\blanguage:\s*eng\b/i.test(trimmed)) return trimmed;
  return `${trimmed} language:eng`;
}

const RESOLVE_CONCURRENCY = 5;

/** Resolve titles for search/discover rows that look non-English. */
export async function resolveEnglishTitlesForBooks<
  T extends { id: string; title: string },
>(books: T[]): Promise<T[]> {
  const out = [...books];
  const indices: number[] = [];
  for (let i = 0; i < out.length; i += 1) {
    if (looksNonEnglishTitle(out[i].title)) indices.push(i);
  }
  if (indices.length === 0) return out;

  for (let start = 0; start < indices.length; start += RESOLVE_CONCURRENCY) {
    const batch = indices.slice(start, start + RESOLVE_CONCURRENCY);
    await Promise.all(
      batch.map(async (i) => {
        const row = out[i];
        const title = await resolveEnglishDisplayTitle(row.id, row.title);
        out[i] = { ...row, title };
      }),
    );
  }

  return out;
}
