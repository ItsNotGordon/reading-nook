# Reading Nook — Product PRD (current shipped app)

**Status:** Canonical product specification — aligned with the codebase in `app/`  
**Project:** Reading Nook  
**Primary platform:** Mobile-first web  
**Stack:** Next.js App Router, React, TypeScript, Tailwind CSS  
**Backend:** **Supabase** is the **required** platform for auth, library sync, profiles (including `@username` and avatars), friendships, social feed, and Row Level Security.  
**Canonical purpose:** Track books, rank finished reads by taste (not stars), discover titles via Google Books, and connect with a small circle of friends.

Reading Nook should feel like a cozy reading companion, not a social feed and not a machine-learning demo.

---

## 1. Product Overview

Reading Nook is a small, mobile-first reading tracker for personal use and a **friends-scale** social layer backed by Supabase.

It combines:

- **Goodreads-style shelves** (Want to Read, Currently Reading, Finished)  
- **Beli-style sentiment** (`liked` / `okay` / `disliked`) and **pairwise ranking** inside buckets to derive numeric scores  
- **Google Books API** for live search, work enrichment, and recommendation candidates (migrated from Open Library due to persistent 403 errors)  
- **Client-side, app-state recommendations** ("For You") from catalog + Google Books discover — **not** the legacy Goodbooks JSON pool as the live source

The app is no longer framed as a STAT 280 deliverable. STAT artifacts, Goodbooks CSVs, and offline Python recommenders remain **legacy/reference only** (see §14).

**Philosophy (ratings):** No star ratings. Users express **how a finished book felt** and **which book they liked more** in pairwise steps; numeric scores are derived from bucket + rank.

**Philosophy (social):** Friends are lightweight — a personal home feed of shelf activity and user posts, but no followers or viral mechanics. Friend libraries are visible only in the context of accepted friendships and server-enforced policies.

---

## 2. Current Architecture

### Repository layout


| Area                                                     | Role                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `app/`                                                   | **Next.js product app** — all shipped UI, API routes, and client state                        |
| `supabase/migrations/`                                   | SQL migrations applied to the hosted Supabase project (**six** migration files: `001`–`006`) |
| `docs/`                                                  | Product and setup documentation (`SUPABASE_SETUP.md`, `DEPLOY.md`, this PRD)                  |
| `notebook.ipynb`, `recommender/`, `git-forked-database/` | Legacy / reference (see §14)                                                                  |


### Runtime model

- **Client app state** lives in React (`ReadingNookProvider` + reducer). Canonical TypeScript types are in `app/src/lib/types.ts`.  
- **Persistence (server-authoritative):** Supabase is the **source of truth**. `localStorage` key `**reading-nook-v1`** serves as a **write-through cache** for fast startup renders — on page load, cached state is displayed immediately, then the server copy overwrites it. All mutations are optimistic (dispatched locally for instant UI), then pushed to the server within 500ms.  
- **Hydration safety:** `ReadingNookProvider` exposes a `**ready`** flag (`false` during SSR, `true` after localStorage state is loaded). `ThemedPageShell` defers rendering children and the decoration backdrop until `ready` to prevent SSR/client hydration mismatches.  
- **Cloud sync:** `**/api/sync`** reads/writes a per-user JSON `**libraries.state**` row and merges `**profiles**` fields (`display_name`, `tagline`; username and avatar via dedicated APIs). On login/page load, `SyncStatusProvider` always fetches from the server and hydrates (server wins — no conflict dialog). If the server is empty but local data exists, it auto-pushes.  
- **Friends:** Friendship rows in `**public.friendships`**; profile discovery and friend library/taste via `**/api/friends**`, `**/api/users/***`, and related routes under `app/src/app/api/`.  
- **Social feed:** Feed events (`feed_events`) and user posts (`posts`) with reactions (`post_reactions`) — shelving activity, progress updates, finished-with-rating events, and free-form posts. Feed is visible on the Home tab (`/home`).

### Main navigation (bottom tabs)

```txt
Home | Library | Add | Ratings | Profile
```

**Home tab** shows the social feed (§5). All other tabs remain as documented below.

**Nested highlighting:** `BottomNav` treats a tab as active when `pathname === href` **or** `pathname.startsWith(href + "/")`, so e.g. `/friends/alice` highlights **Friends**, and `/profile/settings` highlights **Profile**.

### Routes (shipped)


| Path                  | Behavior                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `/`                   | Redirects to `/home`                                                                                |
| `/home`               | Home feed — social activity from friends and self, new post composer                                |
| `/library`            | Library shelves                                                                                     |
| `/ratings`            | Finished books, filters, derived scores, detail sheets                                              |
| `/add`                | **Unified** Google Books search + "For You" recommendations + shelf picker + finish flow            |
| `/clubs`              | **Placeholder** — "Coming soon" stub for future book clubs feature                                  |
| `/friends`            | Friends list, requests, discovery (Supabase-backed when configured)                                 |
| `/friends/[username]` | **Route-based friend profile** (not a modal sheet); invalid usernames show a minimal error state    |
| `/profile`            | Profile stats, hero, insights — **not** the primary home for account backup or full account UI      |
| `/profile/settings`   | **Settings** shell: account-oriented actions and **library backup** import/export where implemented |
| `/login`              | Sign-in entry (Google OAuth only — mandatory before accessing any other route)                       |
| `/auth/callback`      | OAuth / auth callback handler                                                                       |
| `/recs`               | **Not a product surface** — immediately `**redirect("/add")`**                                      |
| `/leaderboard`        | Client `**router.replace("/ratings")**` — legacy path only                                          |


API routes (non-exhaustive; see `app/src/app/api/`): `sync`, `books/search`, `books/isbn`, `books/work`, `books/discover`, `feed`, `feed/events`, `feed/posts`, `feed/posts/[postId]`, `feed/posts/[postId]/react`, `friends`, `friends/[friendId]/library`, `friends/[friendId]/profile`, `friends/[friendId]/taste`, `profile/username`, `profile/avatar`, `users/[username]`, `users/search`.

---

## 3. Auth + Supabase Sync

### Supabase status

Supabase is **required** for this product: profiles, library JSON sync, friendships, social feed, storage (avatars), and RLS policies are defined in migrations `**001_reading_nook.sql`** through `**006_posts_update.sql**`.

### Sign-in

- **Google OAuth only** (`signInWithOAuth` with Google provider) is the sole sign-in method. Email magic link was removed due to Supabase free tier's 3 email/day limit.  
- **Login is mandatory** — middleware redirects all unauthenticated requests to `/login`. There is no "continue without signing in" option.

### Sync behavior (server-authoritative)

- **GET `/api/sync`:** Returns merged library `AppState` (and `updated_at`) for the signed-in user, overlaying profile name/tagline from `profiles` when needed.  
- **POST `/api/sync`:** Persists updated library JSON for the user.  
- **On page load:** `SyncStatusProvider` always fetches from the server and hydrates local state (server wins). If the server is empty but local data exists (first login migration), it auto-pushes local to cloud.  
- **On state change:** Local mutations are pushed to the server with a **500ms debounce** for near-real-time persistence.  
- **No conflict dialog:** The server is always authoritative. The old `SyncConflictSheet` was removed.

Details: `docs/SUPABASE_SETUP.md`, `app/src/components/SyncStatusProvider.tsx`, `app/src/lib/cloudSync.ts`.

---

## 4. Core Data Model

Authoritative definitions: `**app/src/lib/types.ts`**. Summaries below are descriptive; if this PRD and code disagree, **code wins**.

### `Book`

Catalog metadata: `id`, `title`, `author`, `coverUrl`, `totalPages` (`**0` means unknown**), `genres`, `description`, optional API-derived fields (`publishedYear`, `averageRating`, `ratingsCount`, `readinglogCount`). Book IDs use a provider prefix: `**googlebooks:`** for Google Books entries, `**openlibrary:**` for legacy Open Library entries (both supported for backward compatibility).

### `Shelf`

`"want_to_read" | "reading" | "finished"` — UI labels: **Want to Read**, **Currently Reading**, **Finished**.

### `UserBook`

Per-user copy: `shelf`, `progressMode` (`exact` | `estimated`), `currentPage`, `estimatedRange`, finish timestamps (`finishedAt`, `finishedSortAt`), sentiment `sentimentBucket`, `derivedScore`, `addedAt`, `notes`.

### `BucketRankings`

`Record<SentimentBucket, BookId[]>` — ordered IDs per bucket; **pairwise insertion** (`PairwiseComparisonSheet`) updates these orders.

### `UserProfile` (local state)

`displayName`, `tagline`, `theme` (`plant` | `coffee` | `matcha` | `cats` | `galaxy` | `raindrops` | `sakura` | `vinyl`). Cloud `profiles` row adds `**username`** and `**avatar_url**` (not duplicated inside `AppState` JSON — fetched via `/api/profile/username` and `/api/profile/avatar`).

### `AppState`

```ts
{
  version: 1;
  catalog: Record<BookId, Book>;
  userBooks: Partial<Record<BookId, UserBook>>;
  bucketRankings: BucketRankings;
  profile: UserProfile;
  dismissedRecIds: BookId[];
  blacklistedTitleWords: string[];
}
```

### Supabase tables (migrations)

- `**profiles`:** `id` (auth user), `display_name`, `tagline`, `username`, `avatar_url`, `share_shelves` (see §10 — policy evolution)  
- `**libraries`:** `user_id`, `state` (jsonb app snapshot), `updated_at`  
- `**friendships`:** `requester_id`, `addressee_id`, `status` (`pending` | `accepted`)  
- `**feed_events`:** `user_id`, `event_type` (`shelved` | `progress` | `finished`), `book_id`, `book_title`, `book_cover_url`, `shelf`, `sentiment`, `derived_score`, `progress`, `created_at` — auto-generated from user library actions  
- `**posts`:** `user_id`, `body`, `book_id`/`book_title`/`book_cover_url`/`book_author` (optional book attachment), `created_at`, `updated_at` — user-authored free-form posts  
- `**post_reactions`:** `post_id`, `user_id`, `reaction` — emoji reactions on posts  
- **Storage bucket `avatars`:** public read, user-scoped write policies (`003_profiles_avatar.sql`)

---

## 5. Home Feed

### Overview

`/home` is the default landing tab — a merged, reverse-chronological feed of activity from the signed-in user and their accepted friends. The page also features **Friends** and **Clubs** quick-access buttons at the top (Clubs links to a "Coming soon" placeholder at `/clubs`).

### Feed items

| Type | Source | Display |
| --- | --- | --- |
| **Shelved** | User moves a book to a shelf | "[User] added [Book] to [Shelf]" with book card |
| **Progress** | User updates reading progress | "[User] is reading [Book]" with visual progress bar (upserted — only the latest progress event per book is kept) |
| **Finished** | User rates a finished book via pairwise ranking | "[User] finished [Book]" with numeric score circle (matching `/ratings` badge style, colored by sentiment bucket) |
| **Post** | User writes a free-form post | Text body, optional attached book card, emoji reactions, edit/delete for own posts |

### Feed cards

- Author names link to `/friends/[username]` profile pages (clickable profile links for friend discovery).  
- Author display shows `@username` when available, falling back to display name.  
- Finished-book events show a **circular score badge** (e.g. "8.5") with sentiment-bucket coloring (green for liked, amber for okay, red for disliked), matching the visual style on the `/ratings` page.  
- Book attachments on posts use the same visual card style as auto-generated events.  
- Users can **edit** and **delete** their own posts from the feed.

### Implementation

- Events are **client-pushed** via `postFeedEvent()` in `app-state.tsx` whenever library actions fire (shelving, progress updates, pairwise ranking completion).  
- Posts are managed via `/api/feed/posts` (CRUD) and `/api/feed/posts/[postId]/react` (reactions).  
- The merged feed is fetched from `/api/feed` which combines `feed_events` and `posts` with profile data, sorted by `created_at`.

---

## 6. Library

- **Sections:** Currently Reading → Finished → Want to Read (display order).  
- **Cards:** Cover, title, author; reading progress for active reads; derived score / sentiment styling for finished items when present.  
- **Sorting:** Finished by `finishedSortAt` / `finishedAt` / `addedAt`; other shelves newest `addedAt` first (see shelf helpers in codebase).  
- **Actions:** Move shelves, open progress update for **Currently Reading**, start finish + pairwise flows from Library where wired (`LibraryShelves`, `FinishBookSheet`, `PairwiseComparisonSheet`).  
- **Deep link:** `/library?shelf=…` is used from profile shelf snapshots.

---

## 7. Add + Recommendations

### Add tab (`/add`)

Single surface: **one search field**, Google Books results (via internal API routes), **recommendation list**, genre chip filtering where implemented, shelf picker (with book description preview), and finish flow when **Finished** is chosen.

Search is **Google Books–first** (`app/src/app/api/books/search/route.ts`, `googleBooks.ts`). Results exclude books already in `userBooks` where implemented.

### "For You" recommendations (live)

Built from `**app/src/lib/appNativeRecommendations.ts`** using `**hybridAprioriKnnRecommend**` (`app/src/lib/recommender/`) plus taste signals from finished books — candidates from **unshelved catalog** and **Google Books discover** when the catalog pool is small (`APP_NATIVE_SOURCE_DISCOVER`, threshold in `appNativeRecommendations.ts`).

**Rules:** Hide shelved books and dismissed IDs (`dismissedRecIds`); do **not** depend on Goodbooks JSON for live UI.

### Discover pool and auto-refill

The discover endpoint (`/api/books/discover`) fetches **2 batches of 40 books per genre** across the user's top 4 genres (8 Google Books API calls per page), producing ~70–100 quality candidates after filtering. Candidates are filtered for: `ratingsCount > 0` (when present), `publishedYear >= 1900`, non-empty description, and `totalPages >= 100` (to exclude children's picture books).

The client pool (`useRecommendationsPool`) **auto-refills**: when `notShelvedRecs.length` drops below 20 (e.g. via dismissals), the hook fetches the next page of discover results and merges them in, up to 3 pages maximum. This ensures the recommendation pool stays populated as users interact. `RECS_POOL_MAX` is **120**; `RECS_VISIBLE_COUNT` is **10** (shuffled from the pool).

### Genre enrichment

Google Books categories are often sparse (e.g. just `"Fiction"`). The system enriches genres via two methods:

1. **Category segment mapping:** Each Google Books category string (e.g. `"Fiction / Science Fiction / General"`) is split on `/` and each segment is mapped through `genreVocabulary.ts` canonical labels.
2. **Description-based extraction:** Book descriptions are scanned for genre keywords (e.g. "dystopian", "romance", "thriller") to supplement sparse categories. Rules are defined in `googleBooks.ts` (`DESC_GENRE_RULES`).

### Recommendation system display names

The two recommendation engines use **user-friendly names** in the UI to make them accessible to the average user:


| Internal engine          | UI label          | Description                                                                                                                         |
| ------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `hybrid` (Apriori + KNN) | **For You**       | Personalized recommendations blending genre affinity mining, sentiment-based nearest-neighbor scoring, and Google Books popularity. |
| `tfidf`                  | **Similar Vibes** | Recommendations based on genre and author term overlap with the user's finished books.                                              |


The internal engine identifiers (`hybrid`, `tfidf`) and algorithm implementations are unchanged; only the labels shown to users were updated.

### `/recs`

**Not a product route** — exists only as a **redirect to `/add`** (`app/src/app/(tabs)/recs/page.tsx`). Do not document a standalone Recs tab.

---

## 8. Ratings

`/ratings` is the personal finished-book view (not a public leaderboard): ranked lists, derived scores, sentiment styling, text search, genre/author filters, URL query params `**genre**`, `**author**`, `**q**`, `**bucket**` (`RatingsPageClient`), editable detail flows where implemented.

**Legacy:** `/leaderboard` replaces to `/ratings`; avoid "Leaderboard" in primary nav copy.

---

## 9. Profile + Settings

### Profile (`/profile`)

- **Hero (`ProfileHeroCard`):** **Display name** in the **upper corner**; when signed in with a username set, the **main heading** shows the **username without a literal `@` prefix**; otherwise prompts to set username or falls back to display name. Tagline, avatar (when signed in), **Edit profile** and **Settings** links.  
- **Body:** Stats, favorite book, genres, authors, sentiment insights, shelf snapshot links, etc. — **without** pushing account management and **library backup** into the main scroll (those live under **Settings**).  
- **Theming:** Profile page uses `**PageShell`** plus inline `**ProfileDecorationBackdrop**` for the same decorative themes as other tabs (see §11 — implementation detail differs from `ThemedPageShell` import but visuals align).

### Settings (`/profile/settings`)

Wrapped in `**ThemedPageShell**` with title **Settings**. Hosts **account** controls and **library backup** import/export (`LibraryBackupSection` and related), isolated from the main profile marketing/stats experience.

### Edit Profile sheet

Owns display name, tagline, theme picker (8 themes in a 4-column grid), cloud `@username`, avatar upload, and destructive local resets as implemented (`EditProfileSheet`, profile API routes).

---

## 10. Friends

### Data + access

- Friend relationships are stored in `**friendships`** with RLS limited to participants.  
- **Migration `004`:** Accepted friends may **always** read each other's `**libraries`** row (library JSON) — the earlier `share_shelves`-gated friend read on libraries was **dropped**; `share_shelves` default was set to **true** for backward compatibility but **friend library visibility is not product-gated on that flag anymore** for accepted pairs.

### UX

- `**/friends`:** Pending/accepted lists, send requests, search users by username (`/api/users/search`, `/api/users/[username]`).  
- `**/friends/[username]`:** **Full-page friend profile** via `FriendProfileView` — **not** a modal sheet.  
- **Insights (`FriendProfileInsights`):** When the friend has **ratings rows**, the **Finished** shelf subsection is **omitted** from the library area to avoid duplicating finished content already shown in ratings; the library section hides entirely if it would be empty.

### APIs

`GET`/`POST` `/api/friends`, friend-scoped `library`, `profile`, `taste` routes — all require Supabase + auth as implemented.

---

## 11. Theming

- User-selectable `**AppTheme`:** `plant`, `coffee`, `matcha`, `cats`, `galaxy`, `raindrops`, `sakura`, `vinyl` (8 themes).  
- **New accounts** are assigned a **random theme** on first load (client-side, after hydration) to encourage discovery of theme options when comparing with friends.  
- Each theme defines a **nav color palette** (accent, accentSoft, border, barBg, activeShadow), a **background gradient**, **decoration image slots**, and a **preview image** for the picker.  
- **Library, Ratings, Add, Friends list, Friend profile, and Settings** use `**ThemedPageShell`**, which applies `**ProfileDecorationBackdrop**` using `state.profile.theme`. `ThemedPageShell` defers rendering children until the `ready` flag is true to avoid SSR hydration mismatches.  
- **Profile tab** applies the same `**ProfileDecorationBackdrop`** inside `**PageShell**` (no `ThemedPageShell` import on that page — intentional layout for hero + scroll).  
- **Bottom nav** accent tokens (`--nav-accent`, etc.) follow the active profile theme via CSS variables (`ProfileThemeApplier` / related).  
- **Intent:** Decorative motifs are tied to the user's profile theme and appear across primary tabs for a cohesive "nook" — not arbitrary global app skins.


| Theme     | Navbar accent | Style           |
| --------- | ------------- | --------------- |
| plant     | dark sage     | nature/greenery |
| matcha    | green         | tea ceremony    |
| coffee    | brown         | warm cafe       |
| cats      | orange        | cozy cats       |
| galaxy    | light purple  | cosmic/stars    |
| raindrops | light blue    | rainy day       |
| sakura    | light pink    | cherry blossoms |
| vinyl     | bold red      | music/records   |


Key files: `ThemedPageShell.tsx`, `ProfileDecorationBackdrop.tsx`, `ProfileThemeApplier.tsx`, `profileTheme.ts`, `BottomNav.tsx`.

---

## 12. Progress Tracking

Applies to **Currently Reading** (`shelf === "reading"`).

### Estimated

User picks one of four canonical fraction bands (e.g. 0–25%, …). Stored as `estimatedRange: [lo, hi]`. **UI:** compact **2×2 grid of rectangular tiles** (percent label + short qualitative label) in `**ProgressUpdateSheet`**.

### Exact

**Always available** in the sheet: user may enter **Current page** (left) and **Total pages** (right) even when catalog `totalPages === 0` (common for API-sourced books). Saving calls `**updateReadingExactProgress`**, which updates **both** the catalog copy's `totalPages` and the `UserBook` exact progress fields (`UPDATE_READING_EXACT_PROGRESS` in `app-reducer.ts`).

Progress bars elsewhere should remain readable on small screens (exact fill vs estimated band treatment in shelf cards — see components under `LibraryShelves` / book cards).

---

## 13. Deployment / Env

- **Vercel (or similar):** Project **root directory = `app/`** (see `docs/DEPLOY.md`, `app/vercel.json`).  
- **Build / verify (from `app/`):** `npm run dev`, `npm test`, `npm run lint`, `npm run build`.  
- **Environment:** Copy `app/.env.example` → `app/.env.local` and set `**NEXT_PUBLIC_SUPABASE_URL`** and `**NEXT_PUBLIC_SUPABASE_ANON_KEY**` (**required** — app enforces login). Optional `**SUPABASE_SERVICE_ROLE_KEY**` server-only as documented. Set `**GOOGLE_BOOKS_API_KEY**` for book search and discover (free tier: 100 requests/minute, no daily cap).  
- **Without Supabase env:** App will **not function** — middleware forces login, and login requires Supabase + Google OAuth configuration.  
- **LAN testing:** `npm run dev -- --hostname 0.0.0.0 --port 3000` then open the host machine's IP on a phone.

---

## 14. Legacy / Reference Systems

Treat as **non-product sources** for live behavior:


| Asset                                      | Notes                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `git-forked-database/` (Goodbooks CSVs)    | Historical corpus — **not** the live recommendation pool in the Next app |
| `recommender/` (Python)                    | Offline / experiments                                                    |
| `notebook.ipynb`                           | STAT course artifact                                                     |
| `app/src/lib/bookProviders/openLibrary.ts` | **Deleted** — replaced by `googleBooks.ts`                               |
| `app/src/components/MagicLinkAuthForm.tsx`  | **Deleted** — email sign-in removed in favor of Google OAuth only        |
| `app/src/components/SyncConflictSheet.tsx`  | **Deleted** — server-authoritative model has no conflict resolution      |
| `/recs` route                              | Redirect stub only                                                       |
| `/leaderboard`                             | Redirect-only legacy                                                     |


Do not delete without explicit request; do not wire these back in as the primary user-facing recommendation source.

---

## 15. Next Roadmap

Suggested ordering (product, not commitments):

1. **Hardening:** Broader device testing, empty/error states for friends without usernames, feed pagination for performance at scale.
2. **Recommendations:** Tune discover thresholds and copy; optional future **recommendation "lenses"** (e.g. more discovery vs more comfort) **without** prescribing implementation algorithms in this PRD.
3. **Deploy + onboarding docs:** Ensure shared deploy URL users understand Google sign-in + sync.
4. **Feed enhancements:** Notifications for reactions/comments, feed filtering, mute controls — **only** if explicitly scoped.
5. **Additional OAuth providers:** Apple, GitHub, etc. if demand exists.

---

## 16. Cursor / Agent Rules

When editing Reading Nook:

1. **Google Books first** for search and enrichment (via `GOOGLE_BOOKS_API_KEY`). Open Library code has been removed.
2. **Goodbooks / notebook / Python recommender** = reference only — never the live UI recommendation source.
3. **No star ratings** in UI or product direction.
4. **Add stays unified** — no standalone Recs product tab; `/recs` stays a redirect.
5. **Recommendations** = app state + Google Books discover — see `appNativeRecommendations.ts`.
6. **Supabase** = **required** backend; login is mandatory, server is authoritative. No local-only mode.
7. **Profile themes** = user motifs via `ProfileDecorationBackdrop` / `ThemedPageShell` patterns — do not reintroduce unrelated global theme systems.
8. **Canonical genres only** in chips; manual genres optional, capped (see `genreVocabulary.ts` and pickers).
9. **Shelf labels** exactly: Currently Reading, Finished, Want to Read.
10. Prefer **small, incremental** diffs; match existing code style.
11. **Do not edit** `.cursor/plans/` unless the user explicitly asks.
12. **Do not commit** unless the user explicitly asks.
13. After **substantive code** changes: run `npm run lint`, `npm test`, and `npm run build` from `app/`. **Markdown-only doc edits** do not require those commands.

---

**Document maintenance:** This file is the single canonical PRD for the shipped app. `Reading_Nook_Product_PRD.md` in `docs/` points here so older links stay valid.