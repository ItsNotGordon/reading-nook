# PRD: Reading Nook Product

**Status:** Current product spec for the shipped app and near-term direction  
**Project:** Reading Nook  
**App location:** `app/`  
**Primary platform:** Mobile-first web app  
**Stack:** Next.js App Router, React, TypeScript, Tailwind CSS  
**Persistence today:** localStorage-first, with optional Supabase sync paths where configured  
**Canonical purpose:** Track books, rank finished reads, and discover what to read next in a cozy personal reading space.

---

## 1. Product Overview

Reading Nook is a small, mobile-first reading tracker for personal use and eventually a small circle of friends.

It combines:

```txt
Goodreads-style shelves
+
Beli-style sentiment buckets and pairwise ranking
+
Open Library search and discovery
+
client-side taste-aware recommendations
```

The app is no longer a STAT 280 deliverable. The STAT notebook, Goodbooks CSVs, and legacy recommendation scripts remain as history/reference only. The product direction is now a for-fun, product-minded reading app that should be polished enough to deploy and share.

Reading Nook should feel like a cozy reading companion, not a social feed and not a machine-learning demo.

---

## 2. Product Philosophy

Reading Nook does not ask users to manually enter star ratings.

Instead, it asks:

```txt
How did this book make you feel?
Which book did you like more?
```

Users choose a sentiment bucket:

```txt
liked | okay | disliked
```

Then finished books are ranked through pairwise comparisons inside each bucket. Numeric scores are derived from bucket and ranking position.

This makes the rating experience:

- more personal
- less arbitrary than stars
- easy to update
- useful for recommendations and future taste comparison

No star-rating UI should be introduced.

---

## 3. Product Direction

### Current direction

Reading Nook is:

- Open Library-first for live book search and discovery
- local-first by default
- mobile-first in UI decisions
- cozy and personal in tone
- scoped for personal/friends-scale use
- deployable before it needs a full backend

### Not the current direction

Reading Nook is not currently trying to be:

- a large social network
- a viral book platform
- a full Goodreads clone
- a heavy ML showcase
- a backend-first app
- a star-rating app

Backend, auth, sync, and friend features should only be added when the product flow is stable enough to justify them.

---

## 4. Current App Structure

The Next.js app lives in:

```txt
app/
```

Main app areas:

```txt
Library
Ratings
Add
Friends
Profile
```

Current bottom navigation:

```txt
Library | Ratings | Add | Friends | Profile
```

Route behavior:

| Path | Behavior |
| ---- | -------- |
| `/` | Redirects to `/library` |
| `/library` | Library shelves |
| `/ratings` | Finished/ranked books and filters |
| `/add` | Open Library search and recommendations |
| `/friends` | Friend-related placeholder or optional Supabase-backed flows |
| `/profile` | Profile, stats, backup, and account |
| `/recs` | Legacy redirect to Add if present |
| `/leaderboard` | Legacy redirect to Ratings |

There is no standalone Recs tab in the current product direction. Search and recommendations live together on the Add screen.

---

## 5. Core User Loops

### Add a book

1. User opens Add.
2. User searches Open Library by title, author, or genre.
3. Results appear from Open Library.
4. User chooses a shelf:
   - Want to Read
   - Currently Reading
   - Finished
5. If Finished is chosen, finish flow begins.

### Track reading

1. User opens Library.
2. User sees:
   - Currently Reading
   - Finished
   - Want to Read
3. User updates progress for Currently Reading books.
4. Progress can be exact or estimated.

### Finish and rank a book

1. User marks a book as Finished.
2. User picks sentiment:
   - liked
   - okay
   - disliked
3. If needed, app opens pairwise comparison.
4. Book is inserted into the correct bucket ranking.
5. Derived scores are recomputed.

### Review ratings

1. User opens Ratings.
2. User sees finished books with derived scores.
3. User can filter/search.
4. User can open book detail, edit notes/genres/sentiment, and rerank where supported.

### Use Profile

Profile summarizes:

- stats
- favorite book
- top genres
- favorite authors
- sentiment insights
- shelf snapshot
- profile/account settings
- backup import/export

Profile also supports decorative background themes.

---

## 6. Data Model

Types live in:

```txt
app/src/lib/types.ts
```

### Book

```ts
type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  totalPages: number;
  genres: string[];
  description: string;
  publishedYear?: number;
  averageRating?: number;
  ratingsCount?: number;
  readinglogCount?: number;
  wantToReadCount?: number;
  currentlyReadingCount?: number;
  alreadyReadCount?: number;
};
```

Book IDs for Open Library entries use an `openlibrary:` prefix.

### Shelf

```ts
type Shelf = "want_to_read" | "reading" | "finished";
```

Display labels:

| Value | Label |
| ----- | ----- |
| `reading` | Currently Reading |
| `finished` | Finished |
| `want_to_read` | Want to Read |

Shelf display order:

```txt
Currently Reading
Finished
Want to Read
```

### UserBook

```ts
type UserBook = {
  bookId: string;
  shelf: Shelf;

  progressMode: "exact" | "estimated";
  currentPage: number | null;
  estimatedRange: [number, number] | null;

  finishedAt: string | null;
  finishedSortAt: string | null;

  sentimentBucket: "liked" | "okay" | "disliked" | null;
  derivedScore: number | null;

  addedAt: string;
  notes: string;
};
```

Important distinction:

```txt
finishedAt = user-facing finish date
finishedSortAt = latest finish/rerate action timestamp used for Finished shelf order
```

### Bucket rankings

```ts
type BucketRankings = {
  liked: string[];
  okay: string[];
  disliked: string[];
};
```

These arrays are the source of truth for ranking order.

### Profile

Current profile state includes display identity and profile theme/background settings.

Conceptually:

```ts
type UserProfile = {
  displayName: string;
  tagline: string;
  theme?: "plant" | "matcha" | "coffee" | "cats";
};
```

Check `app/src/lib/types.ts` for the exact current shape before editing code.

### App state

```ts
type AppState = {
  version: 1;
  catalog: Record<string, Book>;
  userBooks: Partial<Record<string, UserBook>>;
  bucketRankings: BucketRankings;
  profile: UserProfile;
};
```

State persists under:

```txt
reading-nook-v1
```

---

## 7. Persistence

Today, Reading Nook is local-first.

Primary persistence:

```txt
localStorage key: reading-nook-v1
```

Behavior:

- load state on startup
- save after state changes
- tolerate missing/corrupt data where migration helpers exist
- each browser/device has separate data unless sync is configured

Important limitation:

```txt
A deployed URL does not automatically mean shared accounts or synced libraries.
```

Each user/browser has separate data until auth and database sync are implemented.

Backup import/export remains important because localStorage can be cleared.

---

## 8. Open Library Search and Metadata

Live Add search uses Open Library.

Important files include:

```txt
app/src/app/api/books/search/route.ts
app/src/app/api/books/work/route.ts
app/src/lib/bookProviders/openLibrary.ts
app/src/lib/enrichOpenLibraryBook.ts
```

Search behavior:

- search by title, author, or genre
- queries use Open Library through internal API routes
- language/English-title heuristics are used where possible
- search results exclude books already in the user's library
- selecting a result opens shelf picker
- choosing Finished opens the finish flow

Open Library work enrichment:

```txt
Search result
-> user adds to shelf
-> enrich Open Library work metadata
-> merge description, subjects, title improvements, genres
-> add to catalog/userBooks
```

Open Library data can be uneven. Some works have rich descriptions and subjects; others have little or none. The app should handle sparse metadata gracefully.

---

## 9. Genres

Genres shown in the UI should be clean canonical chips, not raw Open Library subjects.

Current genre direction:

- use a medium-size canonical vocabulary
- map BISAC and LOC subject patterns into readable labels
- cap displayed genres
- avoid raw slash paths and noisy metadata
- allow manual genre edits from the canonical list
- no free-text genre entry for now

Manual genre picker:

- canonical genres only
- optional
- max 6 genres per book
- used when Open Library metadata is missing or incomplete
- available during add/shelving and in finished book detail where implemented

Important files include:

```txt
app/src/lib/genreVocabulary.ts
app/src/lib/bookProviders/openLibraryBisac.ts
app/src/lib/bookProviders/openLibrarySubjects.ts
app/src/lib/genreNormalize.ts
app/src/components/GenreChipPicker.tsx
app/src/lib/mergeCatalogGenres.ts
```

---

## 10. Library Tab

Library shows three shelf sections:

```txt
Currently Reading
Finished
Want to Read
```

Cards show:

- cover
- title
- author
- progress for Currently Reading
- derived score/sentiment for Finished where available
- basic metadata for Want to Read

Sorting:

```txt
Finished:
  newest finishedSortAt
  then finishedAt
  then addedAt
  then deterministic tie-breakers

Currently Reading / Want to Read:
  newest addedAt first
```

Finished cards should open the rated-book detail experience where implemented, not restart the finish flow as if the book had never been rated.

---

## 11. Progress Tracking

Progress applies mainly to Currently Reading books.

Modes:

### Exact

User enters current page.

```txt
progress = currentPage / totalPages
```

Clamp between 0 and 1.

If total pages are unknown, exact page mode should be unavailable or explained.

### Estimated

User chooses a range such as:

```txt
0-25%
25-50%
50-75%
75-100%
```

Stored as:

```ts
estimatedRange: [number, number]
```

Progress UI:

- exact progress uses confirmed filled section
- estimated progress uses lower-bound fill plus estimated band
- unread remainder remains visible
- treatment should remain cozy and legible on mobile

---

## 12. Finish Flow and Pairwise Ranking

When a book is finished:

1. Set shelf to `finished`.
2. Set/update `finishedAt`.
3. Set/update `finishedSortAt`.
4. User chooses sentiment bucket:
   - liked
   - okay
   - disliked
5. App inserts the book into the matching bucket ranking.
6. Derived scores are recomputed.

Pairwise insertion uses a binary-search-style flow:

```txt
low = 0
high = bucket.length
mid = floor((low + high) / 2)

Ask: which book did you like more?

If new book is preferred:
  high = mid
Else:
  low = mid + 1

Insert at low
```

Rerating behavior:

- remove from old bucket
- recompute old bucket
- insert into new bucket
- recompute new bucket

---

## 13. Derived Scores

Users do not enter numeric scores manually.

Score ranges:

| Bucket | Range |
| ------ | ----- |
| liked | 7.0-10.0 |
| okay | 3.6-6.9 |
| disliked | 1.0-3.5 |

Formula:

```ts
if (totalBooks === 1) return bucketMax;

const p = 1 - rankIndex / (totalBooks - 1);
const curved = Math.pow(p, 0.6);
const score = bucketMin + curved * (bucketMax - bucketMin);

return Number(score.toFixed(1));
```

Scores must not overlap between buckets.

Important file:

```txt
app/src/lib/ranking.ts
```

---

## 14. Ratings Tab

Ratings is the user's personal finished-book ranking, not a public leaderboard.

Current behavior includes:

- finished/ranked books
- derived score display
- sentiment styling
- text search
- genre/author filters
- bucket filter via URL param
- editable detail sheet
- move up/down or rerank behavior where implemented

Current URL filters include:

```txt
?genre=
?author=
?q=
?bucket=
```

Search should match:

- title
- author
- genre
- notes where implemented

Clear filters should be easy to see and use.

Legacy route:

```txt
/leaderboard -> /ratings
```

Avoid "Leaderboard" in primary navigation.

---

## 15. Add Tab

Add is the unified search and recommendation screen.

It includes:

1. One search field
2. Open Library search results
3. Recommendation area
4. Genre chip/filter behavior where recommendation rows exist
5. Shelf picker
6. Finish flow when Finished is chosen

The Add tab should remain a single unified screen. Do not split recommendations into a standalone Recs tab unless the product direction changes.

Recent/current behavior:

- search placeholder should support title, author, or genre
- genre-aware Open Library search can merge general search and genre discovery results
- result chips can narrow/filter recommendation visibility
- typing in the unified search field affects the visible search/recommendation context
- recommendations hide dismissed and already-shelved books

---

## 16. Recommendations

Current live recommendations are app-state and Open-Library-aware.

They are not powered by the legacy Goodbooks JSON pool in the UI.

Important files include:

```txt
app/src/lib/useRecommendationsPool.ts
app/src/lib/appNativeRecommendations.ts
app/src/lib/recommender/
app/src/components/RecsListPanel.tsx
```

Current default recommendation concept:

```txt
weighted Apriori + sentiment KNN + popularity blend
```

Product-facing label:

```txt
For You
```

Conceptual behavior:

- use the user's finished books and sentiment buckets as taste signals
- use liked/okay/disliked genres with different weights
- use genre co-occurrence patterns
- use similarity to finished books
- apply disliked genre/author penalties
- include a popularity/familiarity nudge from Open Library metadata
- reserve some room for less obvious but still relevant picks

Candidate sources:

- unshelved app catalog books
- Open Library discover results when the catalog pool is small

Important rules:

- hide books already in `userBooks`
- preserve dismissed recommendation behavior
- do not require Goodbooks CSVs or `recommendations.json` for live UI recommendations
- do not reintroduce the legacy static recommendation pool as the product future

User-facing recommendation copy should emphasize reading taste, similar books, familiar picks, and discovery. It should not over-explain algorithms.

---

## 17. Profile Tab

Profile is both a stats page and a cozy personal space.

It includes:

- name (display name in data)
- @username (when signed in, for Friends)
- tagline
- account section
- library stats
- favorite book
- top genres
- favorite authors
- sentiment insights
- shelf snapshot
- library backup import/export
- edit profile sheet

### Profile decoration themes

Profile has decorative background themes using PNG motifs.

Current themes:

```txt
plant
matcha
coffee
cats
```

Intent:

- decorations are Profile-only
- they are not global app recoloring
- background picker lives in Edit Profile
- bottom nav accent colors may reflect selected profile theme through CSS variables
- other tabs keep the default sage/warm-neutral app palette

Important files include:

```txt
app/src/lib/profileTheme.ts
app/src/components/ProfileDecorationBackdrop.tsx
app/src/components/ProfileThemeApplier.tsx
app/src/components/BottomNav.tsx
app/src/components/EditProfileSheet.tsx
```

Old global palette switching via `ThemeApplier` should not be reintroduced.

### Edit Profile

Edit Profile currently owns:

- name
- @username (cloud)
- tagline
- profile background picker
- danger zone / clear library data

Library backup import/export currently remains on main Profile unless intentionally moved later.

---

## 18. Friends

Friends is a small-scope future direction, not the core app today.

Current direction:

- optional placeholder or Supabase-aware functionality may exist
- do not overbuild social features
- do not turn the app into a feed
- friend features should be opt-in and small-group oriented

Possible future friend features:

- friend invites
- view a friend's shelves
- compare taste overlap
- shared favorite genres
- lightweight compatibility insights

Avoid:

- followers
- public feeds
- comments
- notifications
- viral growth mechanics

---

## 19. Design Requirements

Reading Nook should feel:

- cozy
- soft
- bookish
- mobile-first
- warm
- personal
- calm

Visual direction:

- warm neutral backgrounds
- sage green primary
- honey/amber accents
- rounded cards
- soft shadows
- readable mobile spacing
- decorative profile motifs
- no star ratings

Known colors:

```txt
sage green: #426447
okay/amber: #a27f00
disliked/red: #b13d34
```

Fonts:

```txt
Literata for brand/headings
DM Sans for UI
```

---

## 20. Deployment Direction

Near-term deployment goal:

```txt
Deploy the current local-first app to Vercel.
```

Important deployment notes:

- Vercel root directory should be `app`
- app can deploy before backend/auth exists
- each user/browser has separate local data until sync exists
- backup import/export is important before relying on the app long-term

Run from `app/`:

```bash
npm run dev
npm test
npm run lint
npm run build
```

For LAN/mobile testing:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Then open the laptop LAN IP on the phone.

---

## 21. Future Roadmap

### Phase 1: Stabilize local-first v0.1

- keep Add/Library/Ratings/Profile loops stable
- polish mobile UX
- preserve current recommendation behavior
- run test/lint/build before deploy
- deploy to Vercel

### Phase 2: Data safety

- keep or improve JSON export/import
- clarify localStorage limitations
- prepare clean migration path for future backend

### Phase 3: Recommendation polish

- improve explanations
- tune popularity/taste balance
- improve Open Library discover candidates
- preserve the current Open Library-first direction
- avoid Goodbooks dependency in live UI

### Phase 4: Optional auth and sync

Add only when needed:

- Supabase auth
- hosted user libraries
- bucket rankings
- profile sync
- same account across devices

### Phase 5: Small friend features

After auth/sync:

- friend invites
- taste comparison
- opt-in shelf visibility
- shared genre overlap

---

## 22. Out of Scope Unless Explicitly Requested

Do not add these by default:

```txt
star ratings
manual 1-10 score entry
large social network features
public feed
comments/reviews as a social system
notifications
backend/auth migration
database schema implementation
Goodbooks dependency for live recommendations
editing notebook.ipynb in place
deleting legacy Goodbooks files
standalone Recs tab
global app recoloring themes
```

---

## 23. Repository Guidance

Important repo areas:

```txt
app/
  Next.js product app

docs/
  product/design docs

git-forked-database/
  legacy Goodbooks CSVs

recommender/
  legacy/offline Python recommender

notebook.ipynb
  STAT 280 historical reference
```

Do not edit `.cursor/plans/` unless explicitly asked.

Do not commit unless explicitly asked.

Use small incremental diffs.

Match existing code style.

Run verification commands after substantive code changes:

```bash
npm run lint
npm test
npm run build
```

---

## 24. Success Criteria

### Current local-first product

Reading Nook is successful at this stage if:

1. User can open the app on mobile.
2. User can search Open Library and add books.
3. User can organize books into shelves.
4. User can track reading progress.
5. User can finish a book and choose sentiment.
6. User can rank books through pairwise comparison.
7. Ratings reflects ranking and derived scores.
8. Profile gives useful personal stats and cozy identity.
9. Recommendations feel relevant enough to help the user pick another book.
10. Data persists in the same browser.
11. App builds cleanly for deployment.

### Friends-scale future

Reading Nook is successful later if:

1. Friends can open the same deployed URL.
2. Each person can keep their own library.
3. Sync works across a user's devices.
4. Friend features remain lightweight and opt-in.
5. The app still feels like a personal reading nook, not a social feed.

---

## 25. Agent Rules

When working on Reading Nook:

1. Treat this product as Open Library-first.
2. Treat Goodbooks, notebook, and Python recommender files as legacy/reference.
3. Do not reintroduce star ratings.
4. Keep Add as the unified search and recommendations screen.
5. Keep recommendations app-state/Open-Library-aware.
6. Keep the app local-first unless backend/auth is explicitly requested.
7. Preserve profile decorations as Profile-only motifs.
8. Do not reintroduce global theme recoloring.
9. Use canonical genres only in UI chips.
10. Keep manual genres optional, canonical, and capped.
11. Preserve shelf labels exactly:
    - Currently Reading
    - Finished
    - Want to Read
12. Prefer small product-quality improvements over large rewrites.
13. Run lint/test/build after substantive changes.
14. Do not edit `.cursor/plans/` unless asked.
15. Do not commit unless asked.
