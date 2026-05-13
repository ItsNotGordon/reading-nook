/**
 * Reads Goodreads-style CSV exports and writes app/public/data/books.json
 * for the Reading Nook Add tab (MVP-sized catalog).
 *
 * Inputs (relative to repo root / this script location):
 *   ../../git-forked-database/books.csv
 *   ../../git-forked-database/book_tags.csv
 *   ../../git-forked-database/tags.csv
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const ROOT = path.join(__dirname, "..", "..");
const DB = path.join(ROOT, "git-forked-database");
const OUT_DIR = path.join(__dirname, "..", "public", "data");
const OUT_FILE = path.join(OUT_DIR, "books.json");

const BOOKS_CSV = path.join(DB, "books.csv");
const BOOK_TAGS_CSV = path.join(DB, "book_tags.csv");
const TAGS_CSV = path.join(DB, "tags.csv");

const TOP_N = 1000;
const MAX_GENRES = 8;

/** Split a CSV line respecting double-quoted fields. */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function headerIndex(headerRow, name) {
  const idx = headerRow.indexOf(name);
  if (idx === -1) throw new Error(`Missing column "${name}" in CSV header`);
  return idx;
}

function parseNum(v) {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseIntYear(v) {
  const n = parseNum(v);
  if (n == null) return undefined;
  return Math.round(n);
}

const NON_GENRE_TAGS = new Set([
  "to-read",
  "currently-reading",
  "read",
  "to-buy",
  "owned",
  "owned-books",
  "books-i-own",
  "dan-brown",
  "nicholas-sparks",
  "sophie-kinsella",
  "kindle",
  "audiobook",
  "ebook",
  "library-book",
  "dnf",
  "abandoned",
  "book-club",
  "re-read",
  "wish-list",
  "favorite",
  "favorites",
  "default",
  "book",
]);

function isGenreLike(name) {
  const t = (name || "").trim();
  if (t.length < 3 || t.length > 48) return false;
  const lower = t.toLowerCase();
  if (lower.startsWith("-") || lower.startsWith("--")) return false;
  if (/^-?\d+$/.test(lower)) return false;
  if (/^[\d\s\-_]+$/.test(lower)) return false;
  if (NON_GENRE_TAGS.has(lower)) return false;
  if (!/^[a-zA-ZÀ-ÿ]/.test(t)) return false;
  if (!/^[a-zA-Z0-9À-ÿ\s\-'&.]+$/.test(t)) return false;
  return true;
}

/** Lowercase + strip accents so "clàssics" matches "classics". */
function genreFoldKey(name) {
  const s = String(name || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  return s;
}

/** Merge synonym tags into one display label (counts summed before ranking). */
function canonicalGenreLabel(rawName) {
  const folded = genreFoldKey(rawName);

  switch (folded) {
    case "classic":
    case "classics":
      return "classics";
    case "sci-fi":
    case "science-fiction":
      return "science-fiction";
    case "children":
    case "childrens":
    case "children-s":
      return "children";
    case "dystopia":
    case "dystopian":
      return "dystopian";
    case "nonfiction":
    case "non-fiction":
      return "non-fiction";
    default:
      return folded;
  }
}

function loadBooks() {
  const raw = fs.readFileSync(BOOKS_CSV, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  const iBookId = headerIndex(header, "book_id");
  const iGoodreadsId = headerIndex(header, "goodreads_book_id");
  const iAuthors = headerIndex(header, "authors");
  const iYear = headerIndex(header, "original_publication_year");
  const iTitle = headerIndex(header, "title");
  const iAvg = headerIndex(header, "average_rating");
  const iRatings = headerIndex(header, "ratings_count");
  const iImg = headerIndex(header, "image_url");
  const iSmall = headerIndex(header, "small_image_url");

  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]);
    if (cols.length < header.length) continue;
    const ratings_count = parseNum(cols[iRatings]);
    if (ratings_count == null) continue;
    rows.push({
      book_id: String(cols[iBookId]),
      goodreads_book_id: String(cols[iGoodreadsId] ?? "").trim(),
      authors: cols[iAuthors] || "",
      original_publication_year: cols[iYear],
      title: cols[iTitle] || "",
      average_rating: cols[iAvg],
      ratings_count,
      image_url: cols[iImg] || "",
      small_image_url: cols[iSmall] || "",
    });
  }
  rows.sort((a, b) => b.ratings_count - a.ratings_count);
  return rows.slice(0, TOP_N);
}

function loadTagNames() {
  const raw = fs.readFileSync(TAGS_CSV, "utf8");
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  const iId = headerIndex(header, "tag_id");
  const iName = headerIndex(header, "tag_name");
  const map = new Map();
  for (let li = 1; li < lines.length; li++) {
    const cols = parseCsvLine(lines[li]);
    if (cols.length < header.length) continue;
    map.set(String(cols[iId]), cols[iName] || "");
  }
  return map;
}

/**
 * Rows in book_tags use the first column as a numeric join key. It usually matches
 * books.goodreads_book_id but sometimes matches books.book_id, so the same number can refer to two
 * different volumes (e.g. Fellowship gr_id 34 vs Fifty Shades book_id 34).
 *
 * Prefer goodreads_book_id === key when multiple top-level books claim that key (matches the CSV
 * header and fixes Fellowship vs Fifty Shades). If no goodreads match, use book_id === key. If still
 * ambiguous, fall back to highest ratings_count.
 */
function buildCsvKeyHits(topBooks) {
  /** @type {Map<string, Map<string, { ratings_count: number }>>} */
  const hits = new Map();
  for (const b of topBooks) {
    const canon = String(b.book_id);
    /** @type {(k: string) => void} */
    const touch = (k) => {
      if (!k || !canon) return;
      if (!hits.has(k)) hits.set(k, new Map());
      hits.get(k).set(canon, { ratings_count: b.ratings_count });
    };
    touch(canon);
    touch(String(b.goodreads_book_id ?? "").trim());
  }
  return hits;
}

function pickCanonByRatings(canonMap, canonIds) {
  let bestCanon;
  let bestR = -1;
  for (const cid of canonIds) {
    const r = canonMap.get(cid)?.ratings_count ?? 0;
    if (r > bestR) {
      bestR = r;
      bestCanon = cid;
    }
  }
  return bestCanon;
}

/**
 * @param {Map<string, Map<string, { ratings_count: number }>>} csvKeyHits
 * @param {Map<string, { book_id: string, goodreads_book_id: string, ratings_count: number }>} booksByCanon
 */
function resolveCanonForCsvKey(csvKeyHits, rawKey, booksByCanon) {
  const k = String(rawKey).trim();
  const canonMap = csvKeyHits.get(k);
  if (!canonMap || canonMap.size === 0) return undefined;
  if (canonMap.size === 1) return [...canonMap.keys()][0];

  const canonIds = [...canonMap.keys()];
  const grMatches = canonIds.filter((cid) => {
    const b = booksByCanon.get(cid);
    return b && String(b.goodreads_book_id ?? "").trim() === k;
  });
  const idMatches = canonIds.filter((cid) => {
    const b = booksByCanon.get(cid);
    return b && String(b.book_id) === k;
  });

  if (grMatches.length === 1) return grMatches[0];
  if (grMatches.length > 1) return pickCanonByRatings(canonMap, grMatches);
  if (idMatches.length === 1) return idMatches[0];
  if (idMatches.length > 1) return pickCanonByRatings(canonMap, idMatches);
  return pickCanonByRatings(canonMap, canonIds);
}

async function loadTagsForBooks(topBooks, tagIdToName) {
  const csvKeyHits = buildCsvKeyHits(topBooks);
  /** @type {Map<string, { book_id: string, goodreads_book_id: string, ratings_count: number }>} */
  const booksByCanon = new Map(topBooks.map((b) => [String(b.book_id), b]));

  /** @type {Map<string, Map<string, number>>} */
  const byBook = new Map();

  const rl = readline.createInterface({
    input: fs.createReadStream(BOOK_TAGS_CSV, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNo = 0;
  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1) continue;
    const cols = parseCsvLine(line);
    if (cols.length < 3) continue;
    const rawKey = String(cols[0]).trim();
    const canon = resolveCanonForCsvKey(csvKeyHits, rawKey, booksByCanon);
    if (!canon) continue;
    const tagId = String(cols[1]).trim();
    const count = parseNum(cols[2]) ?? 0;
    if (!byBook.has(canon)) byBook.set(canon, new Map());
    const m = byBook.get(canon);
    m.set(tagId, (m.get(tagId) ?? 0) + count);
  }

  /** @type {Map<string, string[]>} */
  const genresByBook = new Map();
  for (const [bookKey, tagCounts] of byBook) {
    /** @type {Map<string, number>} label -> merged weight */
    const merged = new Map();
    for (const [tagId, cnt] of tagCounts) {
      const name = tagIdToName.get(tagId);
      if (!name || !isGenreLike(name)) continue;
      const label = canonicalGenreLabel(name);
      merged.set(label, (merged.get(label) ?? 0) + cnt);
    }
    const sorted = [...merged.entries()].sort((a, b) => b[1] - a[1]);
    const names = sorted.slice(0, MAX_GENRES).map(([label]) => label);
    genresByBook.set(bookKey, names);
  }
  return genresByBook;
}

function pickCoverUrl(image_url, small_image_url) {
  const m = (image_url || "").trim();
  const s = (small_image_url || "").trim();
  if (m && m !== "https://s.gr-assets.com/nophoto/book/111x148/_noimage_.gif") return m;
  if (s && s !== "https://s.gr-assets.com/nophoto/book/111x148/_noimage_.gif") return s;
  return undefined;
}

async function main() {
  for (const p of [BOOKS_CSV, BOOK_TAGS_CSV, TAGS_CSV]) {
    if (!fs.existsSync(p)) {
      console.error("Missing required file:", p);
      process.exit(1);
    }
  }

  console.log("Loading books…");
  const topBooks = loadBooks();

  console.log("Loading tag dictionary…");
  const tagIdToName = loadTagNames();

  console.log("Scanning book_tags (this may take a minute)…");
  const genresByBook = await loadTagsForBooks(topBooks, tagIdToName);

  const out = topBooks.map((b) => {
    const avg = parseNum(b.average_rating);
    const year = parseIntYear(b.original_publication_year);
    const coverUrl = pickCoverUrl(b.image_url, b.small_image_url);
    const genres = genresByBook.get(b.book_id) ?? [];

    return {
      id: b.book_id,
      title: b.title || "Untitled",
      author: b.authors || "Unknown",
      ...(coverUrl ? { coverUrl } : {}),
      genres,
      ...(year != null ? { publishedYear: year } : {}),
      ...(avg != null ? { averageRating: avg } : {}),
      ratingsCount: b.ratings_count,
    };
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 0), "utf8");
  console.log("Wrote", out.length, "books to", path.relative(ROOT, OUT_FILE));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
