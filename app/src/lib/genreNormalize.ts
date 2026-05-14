/**
 * Normalize catalog / recommendation genre strings: drop non-genre tags,
 * merge synonyms, dedupe (case-insensitive), preserve first-seen display order.
 */

/** Lowercase key with spaces instead of underscores / hyphens / runs of spaces. */
function genreKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[''`'']/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hyphenated Goodreads-style tags that are authors, franchises, prizes, or meta —
 * not genres. Keys are normalized with `genreKey` at init (see `initHyphenDrops`).
 * A small whitelist avoids dropping real multi-word genre tags.
 */
const HYPHEN_TAG_DROP_WHITELIST = new Set<string>([
  "african-american",
  "american-lit",
  "american-revolution",
  "audio-books",
  "chic-lit",
  "coming-of-age",
  "latin-america",
  "mental-illness",
  "native-american",
  "new-england",
  "new-york",
  "personal-development",
  "personal-finance",
  "personal-growth",
  "post-apocalyptic",
  "romantic-suspense",
  "russian-lit",
  "social-issues",
  "south-africa",
  "stand-alone",
]);

const HYPHEN_TAG_DROP_RAW: readonly string[] = [
  "a-song-of-ice-and-fire",
  "abbi-glines",
  "agatha-christie",
  "alex-cross",
  "alpha-male",
  "amy-tan",
  "anita-blake",
  "anne-mccaffrey",
  "anne-rice",
  "bbc-big-read",
  "black-dagger-brotherhood",
  "book-boyfriends",
  "book-club-books",
  "book-group",
  "booker-prize",
  "books-about-books",
  "brandon-sanderson",
  "c-s-lewis",
  "cassandra-clare",
  "cecelia-ahern",
  "charlaine-harris",
  "charles-dickens",
  "chetan-bhagat",
  "childhood-books",
  "could-not-finish",
  "currently-reading",
  "childhood-favorites",
  "christopher-paolini",
  "chuck-palahniuk",
  "colleen-hoover",
  "david-baldacci",
  "david-eddings",
  "dean-koontz",
  "death-note",
  "did-not-finish",
  "diana-gabaldon",
  "diary-of-a-wimpy-kid",
  "dr-seuss",
  "dresden-files",
  "ellen-hopkins",
  "emily-giffin",
  "eoin-colfer",
  "favorite-books",
  "favorite-series",
  "fifty-shades",
  "fifty-shades-of-grey",
  "first-reads",
  "game-of-thrones",
  "guilty-pleasure",
  "guilty-pleasures",
  "harlan-coben",
  "harry-potter",
  "house-of-night",
  "hunger-games",
  "hush-hush",
  "indian-authors",
  "isaac-asimov",
  "j-k-rowling",
  "j-r-r-tolkien",
  "jack-reacher",
  "james-patterson",
  "jamie-mcguire",
  "jane-austen",
  "jane-green",
  "janet-evanovich",
  "jeaniene-frost",
  "jeffery-deaver",
  "jeffrey-archer",
  "jennifer-weiner",
  "jodi-picoult",
  "john-green",
  "john-grisham",
  "john-sandford",
  "kathy-reichs",
  "kay-scarpetta",
  "ken-follett",
  "kristen-ashley",
  "kristin-hannah",
  "kurt-vonnegut",
  "laurell-k-hamilton",
  "lee-child",
  "left-behind",
  "left-behind-series",
  "lois-lowry",
  "lorien-legacies",
  "love-triangle",
  "made-me-cry",
  "maeve-binchy",
  "man-booker",
  "man-booker-prize",
  "maximum-ride",
  "maze-runner",
  "meg-cabot",
  "michael-connelly",
  "michael-crichton",
  "mitch-albom",
  "my-ebooks",
  "my-favorites",
  "my-library",
  "neil-gaiman",
  "nelson-demille",
  "nicholas-sparks",
  "nora-roberts",
  "on-hold",
  "on-writing",
  "oprah-book-club",
  "oprah-s-book-club",
  "orson-scott-card",
  "our-shared-shelf",
  "outlander-series",
  "own-it",
  "owned-books",
  "p-c-cast",
  "patricia-cornwell",
  "paulo-coelho",
  "percy-jackson",
  "philippa-gregory",
  "picoult-jodi",
  "pretty-little-liars",
  "pulitzer-prize",
  "redeeming-love",
  "richelle-mead",
  "rick-riordan",
  "roald-dahl",
  "robert-jordan",
  "robert-ludlum",
  "robin-hobb",
  "rock-star",
  "rock-stars",
  "rory-gilmore-reading-challenge",
  "sarah-dessen",
  "shelfari-favorites",
  "sherlock-holmes",
  "sherrilyn-kenyon",
  "stephanie-plum",
  "stephen-king",
  "stephenie-meyer",
  "sue-grafton",
  "sword-of-truth",
  "sylvia-day",
  "tamora-pierce",
  "terry-brooks",
  "terry-goodkind",
  "terry-pratchett",
  "the-hunger-games",
  "the-selection",
  "to-buy",
  "tom-clancy",
  "v-c-andrews",
  "william-shakespeare",
];

function initHyphenDrops(target: Set<string>): void {
  for (const raw of HYPHEN_TAG_DROP_RAW) {
    if (HYPHEN_TAG_DROP_WHITELIST.has(raw)) continue;
    target.add(genreKey(raw));
  }
}

/** Exact keys after `genreKey` — shelf/meta, known author surnames, franchise slugs, etc. */
const DROPPED_GENRE_KEYS = new Set<string>([
  "harry potter",
  "shakespeare",
  "william shakespeare",
  "currently reading",
  "could not finish",
  "couldnt finish",
  "did not finish",
  "didnt finish",
  "dnf",
  "gave up on",
  "to read",
  "to buy",
  "on hold",
  "favorites",
  "favourites",
  "favorite books",
  "favorite series",
  "books i own",
  "owned",
  "owned books",
  "my books",
  "my library",
  "my favorites",
  "my ebooks",
  "i own",
  "first reads",
  "own it",
  "clancy",
  "grisham",
  "colleen hoover",
]);

initHyphenDrops(DROPPED_GENRE_KEYS);

/** Map normalized key → canonical display label. */
const CANONICAL_BY_KEY = new Map<string, string>([
  ["history", "History"],
  ["play", "Plays"],
  ["plays", "Plays"],
  // Cooking / food (merge cookbook variants)
  ["cooking", "Cooking"],
  ["cookbook", "Cooking"],
  ["cookbooks", "Cooking"],
  ["cook books", "Cooking"],
  ["cook book", "Cooking"],
  // Comics / graphic
  ["comic", "Comics"],
  ["comics", "Comics"],
  ["comic book", "Comics"],
  ["comic books", "Comics"],
  ["comicbook", "Comics"],
  ["comicbooks", "Comics"],
  ["graphic novel", "Comics"],
  ["graphic novels", "Comics"],
  ["graphic novels comics", "Comics"],
  ["comics graphic novels", "Comics"],
  // Classics (spellings + phrases)
  ["classic", "Classics"],
  ["classics", "Classics"],
  ["classical", "Classics"],
  ["clasical", "Classics"],
  ["classic literature", "Classics"],
  ["classic lit", "Classics"],
  ["classics to read", "Classics"],
  ["classic books", "Classics"],
  ["classic book", "Classics"],
  // Creative
  ["creative", "Creative"],
  ["creativity", "Creative"],
  ["creatives", "Creative"],
  // Common tag typo
  ["chic lit", "Chick lit"],
]);

/**
 * Single raw genre string → display label, or `null` to omit entirely.
 */
export function normalizeGenreEntry(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const key = genreKey(trimmed);
  if (!key) return null;
  if (DROPPED_GENRE_KEYS.has(key)) return null;
  const mapped = CANONICAL_BY_KEY.get(key);
  if (mapped) return mapped;
  return trimmed;
}

/**
 * Normalize a list of genres: drop invalid entries, apply synonyms, dedupe by case-insensitive label.
 */
export function normalizeGenreList(genres: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of genres) {
    const n = normalizeGenreEntry(g);
    if (!n) continue;
    const dedupe = n.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(n);
  }
  return out;
}
