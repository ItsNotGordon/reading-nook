import {
  canonicalForSegment,
  isAcceptedGenre,
  segmentKey,
  THEME_TO_GENRE,
  type AcceptedGenre,
} from "@/lib/genreVocabulary";

export type TokenizeResult = {
  segments: string[];
  fictionSignal: boolean;
};

const DROP_VAGUE_SEGMENT_KEYS = new Set([
  "general",
  "miscellaneous",
  "other",
  "all titles",
  "literature",
  "novel",
  "novela",
]);

/** Segments dropped before mapping (meta / geography / not user-facing genres). */
const DROP_SEGMENT_KEYS = new Set([
  "england",
  "england fiction",
  "great britain",
  "great britain fiction",
  "adaptations",
  "readers",
  "class",
  "manners",
  "marriage",
  "wealth",
  "entail",
  "gentry",
  "prejudices",
  "mate selection",
  "prophecies",
  "emoticons",
  "roman",
  "roman anglais",
  "feelings",
]);

function hasFictionSignal(text: string): boolean {
  return /\bfiction\b/i.test(text);
}

function cleanSegment(raw: string): string {
  return raw.trim().replace(/\.+$/, "").trim();
}

function shouldDropSegment(segment: string): boolean {
  const key = segmentKey(segment);
  if (!key || key.length > 80) return true;
  if (DROP_VAGUE_SEGMENT_KEYS.has(key)) return true;
  if (DROP_SEGMENT_KEYS.has(key)) return true;
  return false;
}

/**
 * Split an Open Library subject into mappable segments (BISAC `/`, commas, LOC `--`).
 */
export function tokenizeOpenLibrarySubject(raw: string): TokenizeResult {
  const trimmed = cleanSegment(raw);
  if (!trimmed) return { segments: [], fictionSignal: false };

  let fictionSignal = hasFictionSignal(trimmed);
  let segments: string[] = [];

  if (trimmed.includes("/")) {
    segments = trimmed.split("/").map(cleanSegment).filter(Boolean);
    fictionSignal = fictionSignal || segments.some(hasFictionSignal);
  } else if (/--/.test(trimmed) && hasFictionSignal(trimmed)) {
    const parts = trimmed.split("--").map(cleanSegment).filter(Boolean);
    fictionSignal = true;
    for (const part of parts) {
      if (hasFictionSignal(part)) continue;
      segments.push(part);
    }
    if (segments.length === 0 && parts.length > 0) {
      segments = parts.filter((p) => !hasFictionSignal(p));
    }
  } else if (trimmed.includes(",")) {
    segments = trimmed.split(",").map(cleanSegment).filter(Boolean);
    fictionSignal = fictionSignal || segments.some(hasFictionSignal);
  } else {
    segments = [trimmed];
  }

  const cleaned = segments.filter((s) => !shouldDropSegment(s));
  return { segments: cleaned, fictionSignal };
}

function mapThemeSegment(segment: string): AcceptedGenre | null {
  const key = segmentKey(segment);
  return THEME_TO_GENRE.get(key) ?? null;
}

function audienceHeuristic(segment: string): AcceptedGenre | null {
  const key = segmentKey(segment);
  if (key.includes("juvenile") && key.includes("fiction")) return "Young adult";
  if (key.includes("young adult") && key.includes("non")) return "Non-fiction";
  if (key.includes("young adult")) return "Young adult";
  if (key.includes("children") && key.includes("fiction")) return "Young adult";
  return null;
}

/**
 * Map tokenized segments to canonical Reading Nook genres (allowlist only).
 */
export function mapSegmentsToCanonical(segments: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (label: AcceptedGenre) => {
    if (!isAcceptedGenre(label)) return;
    const dedupe = label.toLowerCase();
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    out.push(label);
  };

  for (const segment of segments) {
    if (shouldDropSegment(segment)) continue;

    const direct = canonicalForSegment(segment);
    if (direct) {
      push(direct);
      continue;
    }

    const audience = audienceHeuristic(segment);
    if (audience) {
      push(audience);
      continue;
    }

    const theme = mapThemeSegment(segment);
    if (theme) {
      push(theme);
    }
  }

  return out;
}
