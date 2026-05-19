# PRD: Reading Nook

> **HISTORICAL / REFERENCE ONLY** — Do not use this file for current product decisions.  
> **Canonical spec:** **[Reading_Nook_Product_PRD.md](./Reading_Nook_Product_PRD.md)** (UI, routes, data model, roadmap).  
> This document is a transition snapshot; some details (e.g. Search | Recs segment) do not match the shipped app.

## 1. Product Overview

**Product Name:** Reading Nook  
**Product Type:** Mobile-first reading tracker and recommendation web app  
**Platform:** Next.js web app optimized for mobile browsers  
**Primary User:** Single user today; multi-user and cloud sync on the long-term roadmap  
**Current Project Context:** Reading Nook began as a STAT 280 project; **the class is finished**. The product is now a **for-fun app with long-term potential**—reading tracking and pairwise ranking first, scalable infrastructure and social features over time.

Reading Nook is a cozy, mobile-first app for tracking books, ranking finished reads, and discovering recommendations based on personal taste.

The product combines:

```txt
Goodreads-style library tracking
+
Beli-style pairwise preference ranking
+
offline recommendation generation from book metadata and user ranking signals
```

The app is currently **local-first** (localStorage, static JSON under `public/data/`). That remains the shipped baseline. New work should move toward **APIs, Postgres/Supabase, auth, and cloud sync** without breaking shelves, progress, or pairwise ranking—see **[Post-STAT Product Direction](#post-stat-product-direction)**.

---

## 2. Product Philosophy

Reading Nook avoids arbitrary star ratings.

Instead of asking:

```txt
How many stars would you give this book?
```

The app asks:

```txt
How did you feel about this book?
Which book did you like more?
```

Scores are derived from ranking position, not manually entered.

This makes ratings feel:

- less arbitrary
- more personal
- easier to maintain
- more useful for recommendations

The app should feel like a personal reading companion, not a social media platform. Social and friend features are **future** additions (Friends tab is a placeholder today), not the current core loop.

---

## Post-STAT Product Direction

### From class project to product

STAT 280 is complete. Reading Nook is no longer a portfolio or statistics deliverable. The north star is a product people keep using: **track → finish → rank → discover**, with optional **friend libraries and taste comparison** once identity and sync exist.

The **current app** (Library, Ratings, Add with search + recs, Profile, Friends placeholder; localStorage + `books.json` / `recommendations.json`) is the baseline. Extend it toward scalable architecture; do not treat class-era ML extraction as the default next milestone.

### STAT 280 work: preserved, not the roadmap

| Asset | Role going forward |
| ----- | ------------------ |
| `notebook.ipynb` | Original Apriori + KNN exploration; **do not edit in place**—copy to experiment. |
| `recommender/` | Offline scripts → `recommendations.json`; reference patterns, not the long-term rec engine. |
| `git-forked-database/` | Goodreads-style CSVs for catalog/rec builds; not required for future hosted catalog APIs. |

**Not the main roadmap:** wiring Apriori + KNN from the notebook into the app, or “Phase 2: extract real recommender” as the primary product goal.

**Is the roadmap:** ranking-driven taste signals, better Recs from user behavior, then **book metadata API → Supabase/Postgres → auth → cloud sync → friend libraries → taste comparison → scalable per-user recommendations**.

### Future scalability roadmap

1. **Real book metadata and search API** — replace or supplement static `books.json` with hosted search, covers, editions, stable external IDs.  
2. **Supabase / Postgres** — libraries, rankings, and rec artifacts in normalized tables with migrations.  
3. **Authentication** — server-authoritative identity (email/OAuth/magic link).  
4. **Cloud sync** — same library and bucket rankings on every device; sensible offline/conflict behavior.  
5. **Friend libraries** — opt-in shared shelves and finished rankings with privacy controls.  
6. **Taste comparison** — overlap and divergence with friends (genres, rank correlation, shared favorites)—not a generic social feed.  
7. **Scalable recommendations** — per-user or per-cohort scoring in backend jobs; cache feeds per user. Ranking signals (buckets, pairwise order, derived scores) stay central; star ratings stay out.

**Architecture principles:** thin Next.js client; auth + Postgres as source of truth; optional batch/ML workers; Beli-style buckets and pairwise ranking unchanged as the taste capture model.

---

## 3. Current Product Status

The app now includes:

```txt
Library
Ratings
Add/Search
Recommendations inside Add
Profile
Friends placeholder
```

The previous `Rank` or `Leaderboard` concept has evolved into a **Ratings** tab.

The previous standalone `Recs` tab has been folded into the **Add** tab and now shows up underneath the search bar.


There is also a placeholder **Friends** tab, but social features are not implemented yet.

---

## 4. Current Navigation

The bottom navigation has five tabs:

```txt
Library | Ratings | Add | Friends | Profile
```

### 4.1 Library

Primary home view for the user’s personal collection.

Shows shelves:

```txt
Currently Reading
Finished
Want to Read
```

### 4.2 Ratings

Shows all rated/finished books in a unified ranked view.

Books are grouped or sorted based on derived scores and sentiment bucket data.

### 4.3 Add

Used for both:

```txt
Search catalog
View recommendations
```

The Add tab has a segment switch:

```txt
Search | Recs
```

When the user types a search query, the tab focuses on catalog search.

### 4.4 Friends

Placeholder only.

Current purpose:

```txt
Future shared libraries / friend taste comparison
```

No backend, no accounts, and no real friend data exist yet.

### 4.5 Profile

Shows reading stats and taste summaries.

Includes information such as:

```txt
total books
shelf counts
average score
top genres
favorite book / favorite authors
```

---

## 5. Technical Architecture

### 5.1 Frontend

The app lives under:

```txt
app/
```

Stack:

```txt
Next.js App Router
React
TypeScript
Tailwind CSS
localStorage
```

There is no backend in the current MVP.

### 5.2 Offline Python Recommender

The recommender lives under:

```txt
recommender/
```

It writes:

```txt
app/public/data/recommendations.json
```

The recommender is not run in the browser.

### 5.3 Dataset

The Goodbooks dataset lives under:

```txt
git-forked-database/
```

Core files:

```txt
books.csv
ratings.csv
book_tags.csv
tags.csv
```

### 5.4 Notebook (reference only)

The original STAT 280 notebook remains at:

```txt
notebook.ipynb
```

It is **historical reference** for how the class hybrid recommender was explored. It should not be edited in place, should not be wired into the Next.js app, and is **not** the source of truth for the product roadmap. See [Post-STAT Product Direction](#post-stat-product-direction).

---

## 6. Data Sources

### 6.1 Book Catalog

The app uses a generated catalog file:

```txt
app/public/data/books.json
```

Generated by:

```bash
npm run build:books
```

This catalog is created from the Goodbooks CSV files.

The Add tab fetches:

```txt
/data/books.json
```

### 6.2 Recommendations

The app uses generated recommendations:

```txt
app/public/data/recommendations.json
```

Generated by:

```bash
npm run build:recs
```

The Recs screen fetches:

```txt
/data/recommendations.json
```

Current recommender status:

```txt
offline JSON pipeline exists (recommender/ → recommendations.json)
recommendations display in Add tab with client-side personalization from rankings
long-term target: per-user recs from backend, not deeper notebook extraction
```

---

## 7. Core Data Model

### 7.1 Book

Represents catalog metadata.

```ts
type Book = {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  totalPages?: number;
  genres: string[];
  description?: string;
  publishedYear?: number;
  averageRating?: number;
  ratingsCount?: number;
};
```

### 7.2 Shelf

Current shelf values:

```ts
type Shelf = "want_to_read" | "reading" | "finished";
```

### 7.3 Progress Mode

```ts
type ProgressMode = "exact" | "estimated";
```

### 7.4 Sentiment Bucket

```ts
type SentimentBucket = "liked" | "okay" | "disliked";
```

### 7.5 UserBook

Represents the user’s relationship to a book.

```ts
type UserBook = {
  bookId: string;
  shelf: Shelf;

  progressMode?: ProgressMode;
  currentPage?: number;
  estimatedRange?: [number, number];

  finishedAt?: string;
  finishedSortAt?: string;

  sentimentBucket?: SentimentBucket | null;
  derivedScore?: number;

  addedAt: string;
};
```

Important distinction:

```txt
finishedAt = user-facing finish date
finishedSortAt = action timestamp used for ordering the Finished shelf
```

This prevents editing an old finish date from breaking the “most recently finished action appears first” behavior.

### 7.6 Bucket Rankings

```ts
type BucketRankings = {
  liked: string[];
  okay: string[];
  disliked: string[];
};
```

Bucket rankings are the source of truth for ranking order.

Derived scores are recomputed from these rankings.

### 7.7 App State

```ts
type AppState = {
  catalog: Record<string, Book>;
  userBooks: Partial<Record<string, UserBook>>;
  bucketRankings: BucketRankings;
};
```

---

## 8. Persistence

The app is local-first.

Storage key:

```txt
reading-nook-v1
```

Persistence behavior:

- load state from localStorage on app mount
- save state after user changes
- normalize old data on hydration
- recompute derived scores from bucket rankings
- handle migration from older progress/ranking fields

The app should continue to work without a backend.

---

## 9. Library Requirements

The Library tab shows three shelf sections:

```txt
Currently Reading
Finished
Want to Read
```

Each section uses horizontally scrollable book cards.

### 9.1 Currently Reading

Cards show:

```txt
cover
title
author
progress display
Update progress action
Mark finished action
```

Progress should be visually clear:

```txt
green = confirmed exact progress
yellow = estimated range
white/clear = unread remainder
thin border around track
```

### 9.2 Finished

Cards show:

```txt
cover
title
author
derived score
sentiment bucket
finished date
```

Finished shelf ordering should prioritize recent finish actions:

```txt
finishedSortAt
finishedAt
addedAt
deterministic tie-breakers
```

The newest finished action should visually appear first.

If the horizontal row was previously scrolled, the Finished shelf should auto-scroll left when the leading item changes.

### 9.3 Want to Read

Cards show:

```txt
cover
title
author
```

Clicking can open shelf movement controls.

---

## 10. Add/Search Requirements

The Add tab supports catalog search.

The catalog comes from:

```txt
/data/books.json
```

Search behavior:

- search by title
- search by author
- search by genres
- hide books already in the user’s library
- allow user to add book to one of the shelves

Shelf choices:

```txt
Currently Reading
Finished
Want to Read
```

If the user chooses Finished, the app should immediately open the finish/sentiment flow.

---

## 11. Progress Tracking Requirements

Progress tracking applies to books on the `reading` shelf.

### 11.1 Exact Mode

User enters current page.

The app uses total page count when available.

Formula:

```ts
progress = currentPage / totalPages;
```

Clamp between 0 and 1.

Display examples:

```txt
125 / 400 pages
31%
```

If total pages are missing, exact mode should be disabled or explained.

### 11.2 Estimated Mode

Used when the user does not know the exact page.

Supported ranges:

```txt
0–25%
25–50%
50–75%
75–100%
```

Stored as:

```ts
estimatedRange: [number, number]
```

Display examples:

```txt
~25–50%
Around halfway
```

Visual display:

```txt
green = confirmed lower bound
yellow = estimated band
white/clear = unread
```

---

## 12. Finish Flow Requirements

When a user marks a book finished:

1. Open finish sheet
2. User selects sentiment bucket
3. User can set finish date
4. App moves book to Finished shelf
5. App starts ranking flow if needed
6. App recomputes derived scores
7. Finished shelf updates visually

The finish sheet should include:

```txt
Liked
Okay
Didn't Like
Finished on date
Save button
Add notes placeholder
```

Closing the sheet should not silently save unsaved date edits.

---

## 13. Sentiment Buckets

The app supports three sentiment buckets:

```txt
Liked
Okay
Didn't Like
```

Mapped internally as:

```txt
liked
okay
disliked
```

Bucket score ranges:

```txt
Liked: 7.0–10.0
Okay: 3.6–6.9
Disliked: 1.0–3.5
```

The user never manually enters these scores.

---

## 14. Pairwise Ranking Requirements

Pairwise ranking is the core product differentiator.

When a user finishes or rerates a book:

1. Select sentiment bucket
2. If bucket is empty, insert directly
3. If bucket has books, compare against existing books
4. Insert into correct bucket position
5. Recompute derived scores

Comparison prompt:

```txt
Which did you like more?
```

The app should use binary-search-style insertion:

```txt
low = 0
high = bucket.length
mid = floor((low + high) / 2)
compare new book against bucket[mid]
if user prefers new book:
  high = mid
else:
  low = mid + 1
repeat until low >= high
insert at low
```

This minimizes comparisons.

### 14.1 Rerating

If a user changes a book’s sentiment bucket:

1. Remove it from old bucket
2. Recompute old bucket scores
3. Insert into new bucket
4. Recompute new bucket scores

---

## 15. Derived Scoring Requirements

Scores are derived from position inside a sentiment bucket.

Formula:

```ts
function getDerivedScore(
  rankIndex: number,
  totalBooks: number,
  bucketMin: number,
  bucketMax: number
) {
  if (totalBooks === 1) return bucketMax;

  const p = 1 - rankIndex / (totalBooks - 1);
  const curved = Math.pow(p, 0.6);
  const score = bucketMin + curved * (bucketMax - bucketMin);

  return Number(score.toFixed(1));
}
```

Example Liked bucket:

```txt
10.0
~8.7
~7.8
7.0
```

Higher score always means more liked.

Scores must not overlap between sentiment buckets.

---

## 16. Ratings Tab Requirements

The Ratings tab replaces the old Leaderboard concept.

Purpose:

```txt
show the user's finished/rated books
```

Current behavior:

- merged list of rated books
- sorted by derived score descending
- score badge
- cover image
- title
- author
- sentiment indicator

The old route:

```txt
/leaderboard
```

should redirect to:

```txt
/ratings
```

The label “Leaderboard” should be avoided because the app is personal, not competitive.

---

## 17. Recommendations Requirements

Recommendations are shown inside the Add tab under the Recs segment.

Route compatibility:

```txt
/recs → /add?tab=recs
```

### 17.1 Recommendation Source

The Recs UI reads:

```txt
/data/recommendations.json
```

Generated offline by:

```bash
npm run build:recs
```

Current recommender pipeline:

```txt
Goodbooks CSVs
↓
offline Python script
↓
recommendations.json
↓
Next.js frontend display
```

### 17.2 Recommendation JSON Contract

Each row should support:

```ts
type Recommendation = {
  bookId: string;
  title: string;
  author: string;
  coverUrl?: string;
  genres: string[];

  rawScore?: number;
  rawKind?: string;

  score: number;
  reason: string;
  source: string;
};
```

Important distinction:

```txt
rawScore = original recommender/Goodreads-style score
score = display score normalized to 0–10
```

### 17.3 Recs UI Behavior

The Recs screen should:

- load recommendations JSON
- filter out books already in user library
- display mobile-friendly cards
- show title, author, cover, genres, score, reason, source
- allow adding recommended books to a shelf
- support genre filtering
- highlight user top genres
- sort by display score descending

### 17.4 Future recommendations (scalable)

Today: static `recommendations.json` plus **in-app personalization** from sentiment buckets, pairwise order, and derived scores.

Target (post-STAT roadmap):

```txt
user library + bucket rankings in Postgres
↓
recommendation service / scheduled job
↓
per-user rec feed (API)
↓
Add tab Recs UI
```

Signals to use (same product philosophy, better infrastructure):

```txt
liked / okay / disliked buckets
derived scores and within-bucket rank
genre and author affinity from finished books
negative signals from disliked bucket
catalog metadata from a real book API
```

The STAT 280 notebook and `recommender/` may inform scoring ideas but are **not** the planned production path. Do not run Python/ML in the browser.

---

## 18. Profile Requirements

Profile summarizes the user’s library and taste.

Should show:

```txt
total books
currently reading count
finished count
want to read count
average derived score
sentiment breakdown
top genres
favorite authors
favorite book
```

Top genre logic:

```txt
use finished books if any exist
else use all shelved books
show top 5
```

The same top genre logic should be shared with Recs UI when possible.

---

## 19. Friends Requirements

Friends is currently a placeholder.

Current purpose:

```txt
show future direction without implementing backend/social features
```

It should clearly communicate that shared libraries are not built yet.

Future possibilities (aligned with [Future scalability roadmap](#future-scalability-roadmap)):

- friend libraries and opt-in shelf sharing
- taste comparison and overlap (not a full social feed)
- shared or comparative recommendations

These require **auth + cloud data** first. The Friends tab stays a placeholder until that work is explicitly requested.

---

## 20. Offline Recommender Requirements

The recommender lives in:

```txt
recommender/
```

Main script:

```txt
recommender/generate_recommendations.py
```

Output:

```txt
app/public/data/recommendations.json
```

Run from app:

```bash
npm run build:recs
```

Current recommender should remain offline.

It should not run:

- in the browser
- inside React components
- during normal page navigation

The `recommender/` folder may keep evolving for **local/offline builds** until a hosted rec service exists. New modules should favor **user ranking inputs** and clear JSON contracts, not notebook parity for its own sake.

---

## 21. Historical STAT 280 artifacts (reference only)

**Do not** treat the following as the active product roadmap:

- Auditing `notebook.ipynb` for Apriori + KNN extraction phases
- Porting notebook cells into the Next.js app
- Completing “full STAT 280 hybrid” as the definition of done for Recs

**Do** preserve:

```txt
notebook.ipynb          — read-only reference; copy to experiment
recommender/            — offline JSON generation for local MVP
git-forked-database/    — dataset for build:books / legacy rec scripts
```

For what to build next, use **[Post-STAT Product Direction](#post-stat-product-direction)** and section **24. Product roadmap** below—not a notebook extraction plan.

---

## 22. Out of Scope For Current MVP (still on product roadmap)

Not built in the local-first MVP unless explicitly requested:

```txt
authentication
cloud database (e.g. Supabase/Postgres)
multi-device sync
real Friends system
reviews/comments
notifications
server-side per-user recommender
live API book search
social feed
book clubs
real-time collaboration
```

The app **stays local-first today**. Items above are **intended future phases** (see Future scalability roadmap), not rejected forever. Implement them when the user asks or when a migration task is scoped—not by default on every change.

---

## 23. Success Criteria

The MVP is successful when the user can:

1. Open the app on mobile
2. Search the catalog
3. Add a book to a shelf
4. Track reading progress
5. Mark a book as finished
6. Choose a sentiment bucket
7. Rank it through pairwise comparison
8. See derived scores
9. View all ratings
10. View profile stats and top genres
11. View generated recommendations
12. Add recommended books to their library
13. Refresh without losing local data

The product is successful long-term when it delivers:

```txt
reliable reading tracking and ranking on any device
personalized discovery from real taste signals
optional social/taste comparison without becoming a feed
maintainable backend (auth, Postgres, APIs) under the same UX principles
```

---

## 24. Product roadmap

### Near term: strengthen the local-first app

- polish Add tab (catalog + recs loading, errors, mobile)
- verify localStorage migrations and `npm run build` / `lint` / `build:books` / `build:recs`
- improve Recs via **ranking-driven personalization** in the client (not notebook extraction)
- document run/deploy flow (`dev` vs `build` + `start`)

### Medium term: scalable foundations

Follow [Future scalability roadmap](#future-scalability-roadmap) in order:

1. Real book metadata/search API  
2. Supabase/Postgres schema for users, libraries, rankings  
3. Authentication  
4. Cloud sync  
5. Friend libraries (Friends tab becomes real)  
6. Taste comparison  
7. Scalable per-user recommendations (replace or supplement global `recommendations.json`)

### Deprioritized unless explicitly requested

- Apriori + KNN notebook extraction as the main Recs strategy  
- Portfolio-only polish that does not serve real usage  

---

## 25. Cursor Rule Summary (superseded)

> Use **`docs/Reading_Nook_Product_PRD.md`** §21 and **`app/AGENTS.md`** instead. This section is kept for history only.
