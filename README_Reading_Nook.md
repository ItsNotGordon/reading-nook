# Reading Nook

**Reading Nook** is a cozy, mobile-first reading tracker web app for tracking books, ranking finished reads by personal taste, discovering what to read next, and optionally connecting with a small circle of friends.

It combines:

- Goodreads-style shelves
- Beli-style pairwise ranking
- Sentiment buckets instead of star ratings
- Google Books search and discovery
- Supabase-backed auth, sync, profiles, avatars, friendships, and friend libraries
- Cozy decorative themes across the app

Reading Nook is built as a product-minded personal/friends-scale app, not a large social network and not a class-project demo.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Product Idea](#core-product-idea)
3. [Current Shipped App](#current-shipped-app)
4. [Main Features](#main-features)
5. [Screens and Routes](#screens-and-routes)
6. [Tech Stack](#tech-stack)
7. [Architecture](#architecture)
8. [Data Model](#data-model)
9. [Recommendations](#recommendations)
10. [Auth, Sync, and Friends](#auth-sync-and-friends)
11. [Themes and Visual Design](#themes-and-visual-design)
12. [Setup and Installation](#setup-and-installation)
13. [Environment Variables](#environment-variables)
14. [Supabase Setup](#supabase-setup)
15. [Google Books Setup](#google-books-setup)
16. [Running the App](#running-the-app)
17. [Testing, Linting, and Building](#testing-linting-and-building)
18. [Deploying to Vercel](#deploying-to-vercel)
19. [Installing Reading Nook on Your Phone](#installing-reading-nook-on-your-phone)
20. [Project History and Inspiration](#project-history-and-inspiration)
21. [Legacy and Reference Systems](#legacy-and-reference-systems)
22. [Current Product Direction](#current-product-direction)
23. [Roadmap Ideas](#roadmap-ideas)
24. [Development Rules](#development-rules)
25. [Troubleshooting](#troubleshooting)

---

## Project Overview

Reading Nook is a small reading app designed around the feeling of having a personal reading corner.

The app helps users:

- search for books
- add books to shelves
- track reading progress
- finish books
- choose how they felt about a book
- rank finished books through pairwise comparison
- receive personalized recommendations
- sync their library across devices
- visit friends' profiles and compare reading taste

The project currently lives in:

```txt
app/
```

The app uses:

```txt
Next.js App Router
React
TypeScript
Tailwind CSS
Supabase
Google Books API
```

The current canonical product specification is:

```txt
docs/Reading_Nook_Product_PRD_Current.md
```

Older PRDs and class artifacts may still exist, but this current PRD should be treated as the source of truth for shipped behavior and near-term direction.

---

## Core Product Idea

Reading Nook avoids star ratings.

Instead of asking:

```txt
How many stars would you give this book?
```

it asks:

```txt
How did this book feel?
Which book did you like more?
```

Finished books are placed into one of three sentiment buckets:

```txt
liked
okay
disliked
```

Then users rank books inside those buckets using pairwise comparisons.

For example:

```txt
Which did you like more?
Book A or Book B?
```

The app uses those answers to derive numeric scores automatically.

This keeps scoring personal, intuitive, and less arbitrary than manual star ratings.

---

## Current Shipped App

The current shipped app includes:

```txt
Library
Ratings
Add
Friends
Profile
Settings
Login
Friend profile pages
```

Current bottom navigation:

```txt
Library | Ratings | Add | Friends | Profile
```

Important route behavior:

```txt
/            -> redirects to /library
/library     -> shelves
/ratings     -> finished/ranked books
/add         -> search + recommendations
/friends     -> friend search, requests, accepted friends
/friends/:username -> route-based friend profile
/profile     -> profile, stats, hero, insights
/profile/settings -> account and library backup/settings
/recs        -> redirects to /add
/leaderboard -> redirects/replaces to /ratings
```

The app is currently **Google Books first** for live book search, enrichment, and recommendation candidates.

Open Library was previously used, but was removed from the live catalog path because persistent 403 and latency issues made it unreliable for this app's needs.

---

## Main Features

### Library Shelves

Reading Nook has three core shelves:

```txt
Currently Reading
Finished
Want to Read
```

Shelf values in code:

```ts
"reading" | "finished" | "want_to_read"
```

Library behavior:

- Currently Reading books show progress.
- Finished books show sentiment and derived scores.
- Want to Read books show basic book metadata.
- Finished books sort by latest finish/rerate timestamps.
- Other shelves sort by newest added first.

---

### Progress Tracking

Progress applies to Currently Reading books.

There are two modes:

#### Estimated progress

Users choose from four broad progress ranges:

```txt
0-25%
25-50%
50-75%
75-100%
```

The UI uses a compact 2x2 grid of rectangular tiles.

#### Exact progress

Users can enter:

```txt
Current page
Total pages
```

Exact mode is always available, even if the book was imported with unknown page count.

This is important because APIs often return books with:

```txt
totalPages = 0
```

When the user saves exact progress, the app updates both:

- the user's current page
- the catalog book's total page count

---

### Finish Flow

When a user finishes a book:

1. The book moves to the Finished shelf.
2. The user chooses a sentiment bucket:
   - liked
   - okay
   - disliked
3. The app starts pairwise ranking if needed.
4. The book is inserted into the correct bucket order.
5. Derived scores are recomputed.

This flow is one of the core differentiators of Reading Nook.

---

### Pairwise Ranking

Pairwise ranking is inspired by Beli-style comparison.

Instead of manually dragging a book into a list or assigning a number, the app asks:

```txt
Which did you like more?
```

The app uses a binary-search-style insertion flow to minimize comparisons.

Conceptually:

```txt
low = 0
high = bucket.length
mid = floor((low + high) / 2)

Compare new book against bucket[mid]

If the new book is preferred:
  high = mid
Else:
  low = mid + 1

Insert at low
```

---

### Derived Scores

Users never manually type a score.

Scores are derived from sentiment bucket and rank position.

Current sentiment score ranges:

| Bucket | Range |
|---|---|
| liked | 7.0 - 10.0 |
| okay | 3.6 - 6.9 |
| disliked | 1.0 - 3.5 |

The app keeps the buckets non-overlapping.

---

### Ratings

The Ratings page is a personal finished-books ranking page.

It is not meant to feel like a public leaderboard.

Ratings supports:

- derived scores
- sentiment styling
- text search
- genre filter
- author filter
- bucket filter
- URL query params
- detail sheets
- notes and edits where implemented

Legacy route:

```txt
/leaderboard -> /ratings
```

The primary UI should avoid calling this feature "Leaderboard."

---

### Add Search

The Add page is a unified search and recommendation surface.

Users can:

- search Google Books
- see results
- choose a shelf
- add/edit genres where implemented
- add to Finished and trigger the finish flow
- browse recommendations
- dismiss recommendations

The Add page should remain unified.

There is no standalone Recs tab.

---

### Recommendations

Recommendations live inside the Add page.

The app uses live app-state recommendations from:

```txt
app/src/lib/appNativeRecommendations.ts
app/src/lib/recommender/
```

The live UI does not use legacy Goodbooks JSON recommendations.

Current recommendation display names:

| Internal engine | User-facing label |
|---|---|
| `hybrid` | For You |
| `tfidf` | Similar Vibes |

#### For You

"For You" is the default personalized recommender.

It blends:

- weighted genre affinity
- Apriori-style genre relationship mining
- sentiment-based KNN-style similarity
- popularity signals from Google Books
- user dismissals
- blacklisted title words
- unshelved catalog candidates
- Google Books discover candidates

#### Similar Vibes

"Similar Vibes" is the TF-IDF-style recommendation lens.

It recommends books based on overlap with genres, authors, and taste signals from the user's finished books.

The user-facing name should remain approachable. Most users do not need to see algorithm names.

---

### Friends

Friends are now backed by Supabase.

Users can:

- search for users
- send friend requests
- accept pending requests
- visit friend profiles
- view friend libraries/taste data where accepted friendship policies allow

Friend profiles are full routes:

```txt
/friends/[username]
```

They are not modal sheets.

---

### Profile and Settings

Profile is the user's personal reading identity page.

It includes:

- profile hero
- display name
- username
- avatar
- tagline
- stats
- favorite book
- top genres
- top authors
- sentiment insights
- shelf snapshot
- edit profile

Settings are separated from the main Profile scroll:

```txt
/profile/settings
```

Settings contains account-oriented controls and library backup/import/export where implemented.

---

## Screens and Routes

### `/library`

Main shelf view.

Sections:

```txt
Currently Reading
Finished
Want to Read
```

### `/ratings`

Finished books with scores and filters.

### `/add`

Unified search and recommendations.

Uses Google Books for live search and discover.

### `/friends`

Friend search, requests, and accepted friends.

### `/friends/[username]`

Route-based friend profile.

### `/profile`

User profile, hero, stats, insights, and personal theme identity.

### `/profile/settings`

Settings, account controls, sync/account UI, and library backup controls.

### `/login`

Supabase auth entry.

Google OAuth is preferred.

### `/auth/callback`

OAuth callback route.

### `/recs`

Redirects to `/add`.

Do not treat `/recs` as a product route.

---

## Tech Stack

### Frontend

```txt
Next.js App Router
React
TypeScript
Tailwind CSS
```

### Backend / Cloud

```txt
Supabase Auth
Supabase Postgres
Supabase Row Level Security
Supabase Storage for avatars
```

### Book Catalog

```txt
Google Books API
```

### Persistence

```txt
localStorage key: reading-nook-v1
Supabase libraries.state JSON sync when signed in
```

### Testing / Validation

```txt
npm test
npm run lint
npm run build
```

---

## Architecture

### App Directory

The main product app lives in:

```txt
app/
```

Useful subdirectories:

```txt
app/src/app/          Next.js routes and API routes
app/src/components/   UI components
app/src/lib/          types, state, reducer, storage, ranking, providers, recommendations
app/public/           static assets, icons, manifest, decorations
```

### State

The app uses a React provider and reducer.

Important files:

```txt
app/src/lib/app-state.tsx
app/src/lib/app-reducer.ts
app/src/lib/storage.ts
app/src/lib/types.ts
```

The provider exposes a `ready` flag to avoid hydration mismatches between server-rendered HTML and client-loaded localStorage data.

### Sync

When signed in, the app syncs a JSON snapshot to Supabase.

Important pieces:

```txt
/api/sync
SyncStatusProvider
SyncStatusLine
libraries.state
profiles
```

The app can still run local-only if Supabase is not configured.

### Hydration Safety

Because localStorage only exists in the browser, user-specific UI should avoid rendering before client state is ready.

`ThemedPageShell` defers rendering children and decorations until `ReadingNookProvider.ready` is true.

This helps prevent hydration errors where the server renders an empty state but the client immediately renders the user's actual library.

---

## Data Model

The source of truth is:

```txt
app/src/lib/types.ts
```

If this README and the code disagree, the code wins.

### Book

A `Book` represents catalog metadata.

Common fields:

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
};
```

Book IDs use provider prefixes.

Examples:

```txt
googlebooks:<id>
openlibrary:<id>   // legacy/backward compatibility only
```

### UserBook

A `UserBook` represents the user's relationship to a book.

Common fields:

```ts
type UserBook = {
  bookId: string;
  shelf: "want_to_read" | "reading" | "finished";
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

### AppState

The app state includes:

```ts
type AppState = {
  version: 1;
  catalog: Record<BookId, Book>;
  userBooks: Partial<Record<BookId, UserBook>>;
  bucketRankings: BucketRankings;
  profile: UserProfile;
  dismissedRecIds: BookId[];
  blacklistedTitleWords: string[];
};
```

### Supabase Tables

Current migrations include tables and policies for:

```txt
profiles
libraries
friendships
avatars storage bucket
```

There are currently four Supabase migrations:

```txt
001_reading_nook.sql
002_profiles_username.sql
003_profiles_avatar.sql
004_friends_always_share_library.sql
```

Accepted friends can read each other's libraries according to the current migration/policy model.

---

## Recommendations

Reading Nook's recommendations are designed to be product-friendly, not research-heavy.

The UI should avoid algorithm jargon when possible.

### Candidate Sources

Recommendations use:

- unshelved catalog books
- Google Books discover candidates
- the user's finished books
- sentiment buckets
- user dismissals
- blacklisted title words

### For You

The default personalized recommender.

Internally, this uses hybrid logic inspired by:

```txt
Apriori-style genre relationships
+
KNN-style similarity
+
popularity blending
```

User-facing label:

```txt
For You
```

### Similar Vibes

A content-similarity style recommender.

User-facing label:

```txt
Similar Vibes
```

### Recommendation Pool

Current behavior:

```txt
RECS_POOL_MAX = 120
RECS_VISIBLE_COUNT = 10
```

Google Books discover fetches multiple batches across the user's top genres and auto-refills when unshelved recommendations fall below a threshold.

### Important Rules

- Do not use legacy Goodbooks JSON as the live UI source.
- Do not create a standalone Recs tab.
- Keep recommendations inside the Add page.
- Keep algorithm names user-friendly.
- Preserve dismiss behavior.

---

## Auth, Sync, and Friends

### Auth

Google OAuth is the preferred login method.

Email magic link remains in code but is de-emphasized because of Supabase email restrictions and deliverability limitations.

### Supabase Sync

When signed in:

- library data syncs to Supabase
- profile fields sync through profile APIs
- username and avatar are managed through dedicated APIs
- friends and friend libraries use Supabase-backed routes and policies

When not signed in:

- the app can still run local-only
- data persists in the current browser through localStorage

### Friends

Friends are intentionally small-scope.

Reading Nook is not trying to become a public social network.

Friend features should stay focused on:

- accepted friends
- friend libraries
- taste comparison
- profile viewing
- lightweight discovery

Avoid:

- public feeds by default
- viral mechanics
- follower growth loops
- comments/notifications unless explicitly scoped

---

## Themes and Visual Design

Reading Nook should feel:

```txt
cozy
bookish
soft
warm
personal
mobile-first
```

The app currently supports 8 decorative themes:

```txt
plant
coffee
matcha
cats
galaxy
raindrops
sakura
vinyl
```

Themes affect:

- decorative page backdrops
- bottom nav accent colors
- profile identity
- primary tab surfaces through `ThemedPageShell`

Important files:

```txt
app/src/components/ThemedPageShell.tsx
app/src/components/ProfileDecorationBackdrop.tsx
app/src/components/ProfileThemeApplier.tsx
app/src/lib/profileTheme.ts
app/src/components/BottomNav.tsx
```

Themes are not meant to be arbitrary full app skins. They are decorative motifs that make each user's nook feel personal.

---

## Setup and Installation

### Requirements

Install:

```txt
Node.js
npm
Git
```

Recommended:

```txt
Supabase project
Google Books API key
Vercel account for deployment
```

### Clone the Project

```bash
git clone <your-repo-url>
cd reading-nook
```

The Next.js app lives under:

```bash
cd app
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Create:

```txt
app/.env.local
```

You can copy from:

```txt
app/.env.example
```

Common variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_BOOKS_API_KEY=
```

### Important Notes

`NEXT_PUBLIC_SUPABASE_URL` must be the Supabase project URL only.

Correct:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
```

Incorrect:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co/rest/v1/
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only.

Never expose it in client code and never prefix it with `NEXT_PUBLIC_`.

---

## Supabase Setup

Supabase is required for:

- Google OAuth
- user profiles
- usernames
- avatars
- library sync
- friendships
- friend libraries

Migration files live in:

```txt
supabase/migrations/
```

Run the migrations in order in your Supabase project.

Current migration range:

```txt
001 through 004
```

See:

```txt
docs/SUPABASE_SETUP.md
```

for project-specific setup.

### Auth Redirect URLs

Supabase should include redirect URLs such as:

```txt
https://your-vercel-app.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

Use `http://localhost`, not `https://localhost`, for normal local dev.

### Google OAuth

Google OAuth is the preferred sign-in path.

In Google Cloud / Google Auth Platform:

- configure the OAuth consent screen
- create a Web application OAuth client
- add the Supabase callback URL:

```txt
https://your-project-id.supabase.co/auth/v1/callback
```

Then paste the Google Client ID and Client Secret into:

```txt
Supabase -> Authentication -> Providers -> Google
```

---

## Google Books Setup

Reading Nook uses Google Books for live search, enrichment, and recommendation candidates.

Set:

```env
GOOGLE_BOOKS_API_KEY=your_key_here
```

The Google Books API key should be available to server-side routes that call the Google Books API.

The app should not rely on Open Library for live book search anymore.

---

## Running the App

From the app directory:

```bash
cd app
npm run dev
```

Open:

```txt
http://localhost:3000
```

For LAN/mobile testing:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Then open your computer's LAN IP from your phone.

Example:

```txt
http://192.168.1.25:3000
```

---

## Testing, Linting, and Building

Run all commands from:

```txt
app/
```

### Tests

```bash
npm test
```

### Lint

```bash
npm run lint
```

### Build

```bash
npm run build
```

Before deploying or pushing important changes, run:

```bash
npm run lint
npm test
npm run build
```

---

## Deploying to Vercel

The Vercel project root directory should be:

```txt
app
```

Add environment variables in Vercel:

```txt
Project Settings -> Environment Variables
```

Required for full cloud features:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_BOOKS_API_KEY=
```

After adding or changing environment variables, redeploy.

If code changes locally, push to GitHub so Vercel can build the new commit.

Typical flow:

```bash
git status
git add .
git commit -m "Describe change"
git push
```

Do not commit unless you intend to.

---

## Installing Reading Nook on Your Phone

Reading Nook can be added to your phone home screen like a web app.

When installed, it can open without the normal browser address bar, making it feel closer to a native app.

### iPhone / iOS Safari

1. Open Reading Nook in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Confirm the name, such as **Reading Nook**.
5. Tap **Add**.

Then launch it from your home screen.

If the icon does not update after a new deploy:

1. Delete the old home screen shortcut.
2. Open the site in Safari again.
3. Add it to Home Screen again.

IOS can aggressively cache home screen icons.

### Android / Chrome

1. Open Reading Nook in Chrome.
2. Tap the three-dot menu.
3. Tap **Add to Home screen** or **Install app**.
4. Confirm.

### Web App Metadata

Phone installation behavior is controlled by files such as:

```txt
app/public/manifest.webmanifest
app/public/apple-touch-icon.png
app/public/icon-192.png
app/public/icon-512.png
```

For iOS icons, `apple-touch-icon.png` is especially important.

Recommended icon source:

```txt
1024x1024 PNG
full-bleed background
no text
simple readable symbol
```

Recommended generated sizes:

```txt
apple-touch-icon.png 180x180
icon-192.png 192x192
icon-512.png 512x512
```

---

## Project History and Inspiration

Reading Nook started as part of a STAT 280 final project using the Goodbooks-10k dataset.

The original class version explored a hybrid recommender using:

```txt
Apriori
+
KNN
```

The early project idea was:

- mine genre/co-occurrence patterns
- use KNN-style similarity
- recommend books from a static dataset

That class phase is complete.

The app has since evolved into a real product-minded reading tracker.

### Inspirations

Reading Nook is inspired by:

#### Goodreads

For:

- shelves
- reading history
- tracking books
- personal library

But Reading Nook intentionally avoids Goodreads-style star ratings as the core interaction.

#### Beli

For:

- pairwise ranking
- taste-based ordering
- comparative preference instead of arbitrary numeric ratings

#### Cozy personal apps

For:

- warm UI
- custom themes
- profile identity
- calm reading companion feeling

#### Small friend circles

For:

- friend profiles
- taste comparison
- shared reading visibility between accepted friends

The product should feel like a personal nook, not a large-scale social network.

---

## Legacy and Reference Systems

The repo still contains historical materials.

These are not live product systems.

| Area | Role |
|---|---|
| `notebook.ipynb` | STAT 280 notebook/reference |
| `recommender/` | offline Python experiments |
| `git-forked-database/` | legacy Goodbooks CSVs |
| Goodbooks static JSON | legacy/reference only |
| Open Library provider code | removed from current live flow |

Do not wire these back into the live UI unless explicitly scoped.

Do not delete them without explicit permission.

---

## Current Product Direction

Reading Nook is currently moving toward:

```txt
polished personal reading tracker
+
small friend network
+
fast Google Books search
+
Supabase sync
+
cozy identity/themes
+
useful recommendations
```

The app should remain:

- mobile-first
- cozy
- simple to use
- calm
- personal
- friends-scale

The app should avoid becoming:

- a massive social feed
- a star-rating clone
- a heavy ML demo
- a public follower network
- a giant backend-first rebuild

---

## Roadmap Ideas

Current high-priority future ideas include:

### Goodreads Library Import

Allow users to import a Goodreads CSV export.

Likely flow:

1. Upload Goodreads CSV.
2. Parse shelves, dates, ratings, reviews.
3. Map Goodreads shelves to Reading Nook shelves.
4. Map Goodreads star ratings to sentiment buckets.
5. Match books to Google Books when possible.
6. Preserve unmatched books as safe local entries.
7. Sync imported library through Supabase.

Important product rule:

```txt
Do not force users through pairwise ranking for hundreds of imported books.
```

Imported books can be given a stable initial bucket order and refined later.

### Home / Feed Page

Potential future nav direction:

```txt
Home | Library | Add | Ratings | Profile
```

Home would become the landing page and contain:

- currently reading preview
- friend activity
- find friends entry point
- recommended next
- recent personal activity

Friends search/list could remain available at:

```txt
/friends
```

but not necessarily as a bottom nav item.

### Recommendation Lenses

Possible future recommendation modes:

```txt
For You
Similar Vibes
Fresh Finds
Popular Picks
Hidden Gems
```

Keep names user-friendly.

Do not expose algorithm names unless it is useful for developer/debug views.

### More Themes

Current themes:

```txt
plant
coffee
matcha
cats
galaxy
raindrops
sakura
vinyl
```

Possible future themes:

```txt
library/study
autumn
tea/bakery
night reading
ocean/coastal
```

---

## Development Rules

When working on Reading Nook:

1. Run commands from `app/`.
2. Use the current PRD as the source of truth.
3. Keep Add as unified search + recommendations.
4. Do not add a standalone Recs product tab.
5. Do not reintroduce Open Library as the live catalog path.
6. Do not use Goodbooks JSON as the live recommendation source.
7. Do not add star ratings.
8. Preserve shelf labels:
   - Currently Reading
   - Finished
   - Want to Read
9. Preserve Supabase/local-only modes.
10. Do not expose service role keys.
11. Do not edit `.cursor/plans/` unless explicitly asked.
12. Do not commit unless explicitly asked.
13. After substantive code changes, run:

```bash
npm run lint
npm test
npm run build
```

Markdown-only edits do not require a build.

---

## Troubleshooting

### Supabase URL is wrong

Use the project base URL:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
```

Do not use:

```env
https://your-project-id.supabase.co/rest/v1/
```

### Localhost OAuth redirects to Vercel

Make sure the OAuth sign-in code uses the current browser origin:

```ts
redirectTo: `${window.location.origin}/auth/callback`
```

Also make sure Supabase redirect URLs include:

```txt
http://localhost:3000/auth/callback
```

### Magic link email limit

Supabase built-in email has strict limits.

Use Google OAuth as the preferred sign-in method.

### iPhone app icon does not update

IOS caches home screen icons.

Delete the old home screen shortcut and add it again after redeploying.

### Hydration mismatch

This usually means server-rendered UI did not match client-loaded localStorage state.

Use `ReadingNookProvider.ready` and avoid rendering user-specific state before hydration.

### Search is slow or empty

Current live catalog source is Google Books.

Check:

```env
GOOGLE_BOOKS_API_KEY
```

Also check the relevant API route logs.

### Vercel shows 200 but data is missing

A route can return `200` even if an external API failed internally and the app handled the error.

Check server logs for the real external API status or error message.

---

## License

No license specified yet.

Add a license before distributing or accepting outside contributions.

---

## Maintainer Notes

Reading Nook is currently a personal project with product-minded direction.

Prioritize:

```txt
stable core flows
good mobile UX
safe sync
clean PRD/context
small incremental improvements
```

Avoid:

```txt
large unplanned rewrites
overbuilding social features
algorithm-first product decisions
breaking local-only mode
```
