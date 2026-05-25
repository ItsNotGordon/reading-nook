# Reading Nook — Product PRD (current shipped app)

**Status:** Canonical product specification — aligned with the codebase in `app/`  
**Project:** Reading Nook  
**Primary platform:** Mobile-first web  
**Stack:** Next.js App Router, React, TypeScript, Tailwind CSS  
**Backend:** **Supabase** is the active platform for auth, library sync, profiles (including `@username` and avatars), friendships, and Row Level Security — not a future-only option when the project is configured with valid env vars.  
**Canonical purpose:** Track books, rank finished reads by taste (not stars), discover titles via Open Library, and optionally connect with a small circle of friends.

Reading Nook should feel like a cozy reading companion, not a social feed and not a machine-learning demo.

---

## 1. Product Overview

Reading Nook is a small, mobile-first reading tracker for personal use and a **friends-scale** social layer backed by Supabase.

It combines:

- **Goodreads-style shelves** (Want to Read, Currently Reading, Finished)  
- **Beli-style sentiment** (`liked` / `okay` / `disliked`) and **pairwise ranking** inside buckets to derive numeric scores  
- **Open Library** for live search, work enrichment, and recommendation candidates  
- **Client-side, app-state recommendations** (“For You”) from catalog + Open Library discover — **not** the legacy Goodbooks JSON pool as the live source  

The app is no longer framed as a STAT 280 deliverable. STAT artifacts, Goodbooks CSVs, and offline Python recommenders remain **legacy/reference only** (see §13).

**Philosophy (ratings):** No star ratings. Users express **how a finished book felt** and **which book they liked more** in pairwise steps; numeric scores are derived from bucket + rank.

**Philosophy (social):** Friends are lightweight — no public feed, followers, or viral mechanics. Friend libraries are visible only in the context of accepted friendships and server-enforced policies.

---

## 2. Current Architecture

### Repository layout

| Area | Role |
| --- | --- |
| `app/` | **Next.js product app** — all shipped UI, API routes, and client state |
| `supabase/migrations/` | SQL migrations applied to the hosted Supabase project (**four** migration files: `001`–`004`) |
| `docs/` | Product and setup documentation (`SUPABASE_SETUP.md`, `DEPLOY.md`, this PRD) |
| `notebook.ipynb`, `recommender/`, `git-forked-database/` | Legacy / reference (see §13) |

### Runtime model

- **Client app state** lives in React (`ReadingNookProvider` + reducer). Canonical TypeScript types are in `app/src/lib/types.ts`.  
- **Persistence:** `localStorage` key **`reading-nook-v1`** — load on startup, save after changes. Each browser profile holds a copy until sync merges.  
- **Cloud:** When Supabase env vars are present and the user signs in, **`/api/sync`** reads/writes a per-user JSON **`libraries.state`** row and merges **`profiles`** fields (`display_name`, `tagline`; username and avatar via dedicated APIs). Sync UX is driven by `SyncStatusProvider` / `SyncStatusLine`.  
- **Friends:** Friendship rows in **`public.friendships`**; profile discovery and friend library/taste via **`/api/friends`**, **`/api/users/*`**, and related routes under `app/src/app/api/`.

### Main navigation (bottom tabs)

```txt
Library | Ratings | Add | Friends | Profile
```

**Nested highlighting:** `BottomNav` treats a tab as active when `pathname === href` **or** `pathname.startsWith(href + "/")`, so e.g. `/friends/alice` highlights **Friends**, and `/profile/settings` highlights **Profile**.

### Routes (shipped)

| Path | Behavior |
| --- | --- |
| `/` | Redirects to `/library` |
| `/library` | Library shelves |
| `/ratings` | Finished books, filters, derived scores, detail sheets |
| `/add` | **Unified** Open Library search + “For You” recommendations + shelf picker + finish flow |
| `/friends` | Friends list, requests, discovery (Supabase-backed when configured) |
| `/friends/[username]` | **Route-based friend profile** (not a modal sheet); invalid usernames show a minimal error state |
| `/profile` | Profile stats, hero, insights — **not** the primary home for account backup or full account UI |
| `/profile/settings` | **Settings** shell: account-oriented actions and **library backup** import/export where implemented |
| `/login` | Sign-in entry (Supabase auth UI) |
| `/auth/callback` | OAuth / auth callback handler |
| `/recs` | **Not a product surface** — immediately **`redirect("/add")`** |
| `/leaderboard` | Client **`router.replace("/ratings")`** — legacy path only |

API routes (non-exhaustive; see `app/src/app/api/`): `sync`, `books/search`, `books/work`, `books/discover`, `friends`, `friends/[friendId]/library`, `friends/[friendId]/profile`, `friends/[friendId]/taste`, `profile/username`, `profile/avatar`, `users/[username]`, `users/search`.

---

## 3. Auth + Supabase Sync

### Supabase status

Supabase is **first-class** for this product: profiles, library JSON sync, friendships, storage (avatars), and RLS policies are defined in migrations **`001_reading_nook.sql`** through **`004_friends_always_share_library.sql`**.

### Sign-in

- **Google OAuth** (`signInWithOAuth` with Google provider) is the **preferred** sign-in path in the UI (`MagicLinkAuthForm` leads with “Continue with Google”).  
- **Email magic link** (`signInWithOtp`) remains in code for flexibility but is **de-emphasized in product direction**: Supabase’s built-in email quotas and deliverability limits make email OTP a poor primary growth or onboarding strategy. Product copy and future UX should steer users toward **Google**; treat magic link as ancillary or removable later.

### Sync behavior (high level)

- **GET `/api/sync`:** Returns merged library `AppState` (and `updated_at`) for the signed-in user, overlaying profile name/tagline from `profiles` when needed.  
- **POST `/api/sync`:** Persists updated library JSON for the user.  
- When Supabase is **not** configured, sync routes return **503** and the app behaves **local-only** (still valid for forks and local dev).

Details: `docs/SUPABASE_SETUP.md`, `app/src/components/SyncStatusProvider.tsx`, `app/src/lib/storage.ts` (merge helpers).

---

## 4. Core Data Model

Authoritative definitions: **`app/src/lib/types.ts`**. Summaries below are descriptive; if this PRD and code disagree, **code wins**.

### `Book`

Catalog metadata: `id`, `title`, `author`, `coverUrl`, `totalPages` (**`0` means unknown**), `genres`, `description`, optional OL-derived fields (`publishedYear`, `averageRating`, `ratingsCount`, `readinglogCount`). Open Library IDs use an `openlibrary:` prefix.

### `Shelf`

`"want_to_read" | "reading" | "finished"` — UI labels: **Want to Read**, **Currently Reading**, **Finished**.

### `UserBook`

Per-user copy: `shelf`, `progressMode` (`exact` | `estimated`), `currentPage`, `estimatedRange`, finish timestamps (`finishedAt`, `finishedSortAt`), sentiment `sentimentBucket`, `derivedScore`, `addedAt`, `notes`.

### `BucketRankings`

`Record<SentimentBucket, BookId[]>` — ordered IDs per bucket; **pairwise insertion** (`PairwiseComparisonSheet`) updates these orders.

### `UserProfile` (local state)

`displayName`, `tagline`, `theme` (`plant` | `coffee` | `matcha` | `cats`). Cloud `profiles` row adds **`username`** and **`avatar_url`** (not duplicated inside `AppState` JSON — fetched via `/api/profile/username` and `/api/profile/avatar`).

### `AppState`

```ts
{
  version: 1;
  catalog: Record<BookId, Book>;
  userBooks: Partial<Record<BookId, UserBook>>;
  bucketRankings: BucketRankings;
  profile: UserProfile;
  dismissedRecIds: BookId[];
}
```

### Supabase tables (migrations)

- **`profiles`:** `id` (auth user), `display_name`, `tagline`, `username`, `avatar_url`, `share_shelves` (see §9 — policy evolution)  
- **`libraries`:** `user_id`, `state` (jsonb app snapshot), `updated_at`  
- **`friendships`:** `requester_id`, `addressee_id`, `status` (`pending` | `accepted`)  
- **Storage bucket `avatars`:** public read, user-scoped write policies (`003_profiles_avatar.sql`)

---

## 5. Library

- **Sections:** Currently Reading → Finished → Want to Read (display order).  
- **Cards:** Cover, title, author; reading progress for active reads; derived score / sentiment styling for finished items when present.  
- **Sorting:** Finished by `finishedSortAt` / `finishedAt` / `addedAt`; other shelves newest `addedAt` first (see shelf helpers in codebase).  
- **Actions:** Move shelves, open progress update for **Currently Reading**, start finish + pairwise flows from Library where wired (`LibraryShelves`, `FinishBookSheet`, `PairwiseComparisonSheet`).  
- **Deep link:** `/library?shelf=…` is used from profile shelf snapshots.

---

## 6. Add + Recommendations

### Add tab (`/add`)

Single surface: **one search field**, Open Library results (via internal API routes), **recommendation list**, genre chip filtering where implemented, shelf picker, and finish flow when **Finished** is chosen.

Search is **Open Library–first** (`app/src/app/api/books/search/route.ts`, `openLibrary.ts`, enrichment pipeline). Results exclude books already in `userBooks` where implemented.

### “For You” recommendations (live)

Built from **`app/src/lib/appNativeRecommendations.ts`** using **`hybridAprioriKnnRecommend`** (`app/src/lib/recommender/`) plus taste signals from finished books — candidates from **unshelved catalog** and **Open Library discover** when the catalog pool is small (`APP_NATIVE_SOURCE_DISCOVER`, threshold in `appNativeRecommendations.ts`).

**Rules:** Hide shelved books and dismissed IDs (`dismissedRecIds`); do **not** depend on Goodbooks JSON for live UI.

### Recommendation system display names

The two recommendation engines use **user-friendly names** in the UI to make them accessible to the average user:

| Internal engine | UI label | Description |
| --------------- | -------------- | ----------- |
| `hybrid` (Apriori + KNN) | **For You** | Personalized recommendations blending genre affinity mining, sentiment-based nearest-neighbor scoring, and Open Library popularity. |
| `tfidf` | **Similar Vibes** | Recommendations based on genre and author term overlap with the user's finished books. |

The internal engine identifiers (`hybrid`, `tfidf`) and algorithm implementations are unchanged; only the labels shown to users were updated.

### `/recs`

**Not a product route** — exists only as a **redirect to `/add`** (`app/src/app/(tabs)/recs/page.tsx`). Do not document a standalone Recs tab.

---

## 7. Ratings

`/ratings` is the personal finished-book view (not a public leaderboard): ranked lists, derived scores, sentiment styling, text search, genre/author filters, URL query params **`genre`**, **`author`**, **`q`**, **`bucket`** (`RatingsPageClient`), editable detail flows where implemented.

**Legacy:** `/leaderboard` replaces to `/ratings`; avoid “Leaderboard” in primary nav copy.

---

## 8. Profile + Settings

### Profile (`/profile`)

- **Hero (`ProfileHeroCard`):** **Display name** in the **upper corner**; when signed in with a username set, the **main heading** shows the **username without a literal `@` prefix**; otherwise prompts to set username or falls back to display name. Tagline, avatar (when signed in), **Edit profile** and **Settings** links.  
- **Body:** Stats, favorite book, genres, authors, sentiment insights, shelf snapshot links, etc. — **without** pushing account management and **library backup** into the main scroll (those live under **Settings**).  
- **Theming:** Profile page uses **`PageShell`** plus inline **`ProfileDecorationBackdrop`** for the same decorative themes as other tabs (see §10 — implementation detail differs from `ThemedPageShell` import but visuals align).

### Settings (`/profile/settings`)

Wrapped in **`ThemedPageShell`** with title **Settings**. Hosts **account** controls and **library backup** import/export (`LibraryBackupSection` and related), isolated from the main profile marketing/stats experience.

### Edit Profile sheet

Owns display name, tagline, theme picker, cloud `@username`, avatar upload, and destructive local resets as implemented (`EditProfileSheet`, profile API routes).

---

## 9. Friends

### Data + access

- Friend relationships are stored in **`friendships`** with RLS limited to participants.  
- **Migration `004`:** Accepted friends may **always** read each other’s **`libraries`** row (library JSON) — the earlier `share_shelves`-gated friend read on libraries was **dropped**; `share_shelves` default was set to **true** for backward compatibility but **friend library visibility is not product-gated on that flag anymore** for accepted pairs.

### UX

- **`/friends`:** Pending/accepted lists, send requests, search users by username (`/api/users/search`, `/api/users/[username]`).  
- **`/friends/[username]`:** **Full-page friend profile** via `FriendProfileView` — **not** a modal sheet.  
- **Insights (`FriendProfileInsights`):** When the friend has **ratings rows**, the **Finished** shelf subsection is **omitted** from the library area to avoid duplicating finished content already shown in ratings; the library section hides entirely if it would be empty.

### APIs

`GET`/`POST` `/api/friends`, friend-scoped `library`, `profile`, `taste` routes — all require Supabase + auth as implemented.

---

## 10. Theming

- User-selectable **`AppTheme`:** `plant`, `coffee`, `matcha`, `cats`.  
- **Library, Ratings, Add, Friends list, Friend profile, and Settings** use **`ThemedPageShell`**, which applies **`ProfileDecorationBackdrop`** using `state.profile.theme`.  
- **Profile tab** applies the same **`ProfileDecorationBackdrop`** inside **`PageShell`** (no `ThemedPageShell` import on that page — intentional layout for hero + scroll).  
- **Bottom nav** accent tokens (`--nav-accent`, etc.) follow the active profile theme via CSS variables (`ProfileThemeApplier` / related).  
- **Intent:** Decorative motifs are tied to the user’s profile theme and appear across primary tabs for a cohesive “nook” — not arbitrary global app skins.

Key files: `ThemedPageShell.tsx`, `ProfileDecorationBackdrop.tsx`, `ProfileThemeApplier.tsx`, `profileTheme.ts`, `BottomNav.tsx`.

---

## 11. Progress Tracking

Applies to **Currently Reading** (`shelf === "reading"`).

### Estimated

User picks one of four canonical fraction bands (e.g. 0–25%, …). Stored as `estimatedRange: [lo, hi]`. **UI:** compact **2×2 grid of rectangular tiles** (percent label + short qualitative label) in **`ProgressUpdateSheet`**.

### Exact

**Always available** in the sheet: user may enter **Current page** (left) and **Total pages** (right) even when catalog `totalPages === 0` (common for Open Library–sourced books). Saving calls **`updateReadingExactProgress`**, which updates **both** the catalog copy’s `totalPages` and the `UserBook` exact progress fields (`UPDATE_READING_EXACT_PROGRESS` in `app-reducer.ts`).

Progress bars elsewhere should remain readable on small screens (exact fill vs estimated band treatment in shelf cards — see components under `LibraryShelves` / book cards).

---

## 12. Deployment / Env

- **Vercel (or similar):** Project **root directory = `app/`** (see `docs/DEPLOY.md`, `app/vercel.json`).  
- **Build / verify (from `app/`):** `npm run dev`, `npm test`, `npm run lint`, `npm run build`.  
- **Environment:** Copy `app/.env.example` → `app/.env.local` and set **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** for cloud features; optional **`SUPABASE_SERVICE_ROLE_KEY`** server-only as documented.  
- **Without Supabase env:** App runs **localStorage-only** — fine for demos, bad for multi-device continuity.  
- **LAN testing:** `npm run dev -- --hostname 0.0.0.0 --port 3000` then open the host machine’s IP on a phone.

---

## 13. Legacy / Reference Systems

Treat as **non-product sources** for live behavior:

| Asset | Notes |
| --- | --- |
| `git-forked-database/` (Goodbooks CSVs) | Historical corpus — **not** the live recommendation pool in the Next app |
| `recommender/` (Python) | Offline / experiments |
| `notebook.ipynb` | STAT course artifact |
| `/recs` route | Redirect stub only |
| `/leaderboard` | Redirect-only legacy |

Do not delete without explicit request; do not wire these back in as the primary user-facing recommendation source.

---

## 14. Next Roadmap

Suggested ordering (product, not commitments):

1. **Hardening:** Broader device testing, sync conflict UX polish, empty/error states for friends without usernames.  
2. **Recommendations:** Tune discover thresholds and copy; optional future **recommendation “lenses”** (e.g. more discovery vs more comfort) **without** prescribing implementation algorithms in this PRD.  
3. **Account hygiene:** Clarify magic-link positioning (remove UI vs keep hidden); optional additional OAuth providers if demand exists.  
4. **Deploy + onboarding docs:** Ensure shared deploy URL users understand Google sign-in + sync.  
5. **Small social:** Taste summaries, mutual books, notifications **only** if explicitly scoped — default remains calm and opt-in.

---

## 15. Cursor / Agent Rules

When editing Reading Nook:

1. **Open Library first** for search and enrichment.  
2. **Goodbooks / notebook / Python recommender** = reference only — never the live UI recommendation source.  
3. **No star ratings** in UI or product direction.  
4. **Add stays unified** — no standalone Recs product tab; `/recs` stays a redirect.  
5. **Recommendations** = app state + Open Library discover — see `appNativeRecommendations.ts`.  
6. **Supabase** = active backend when env is set; document and test both local-only and cloud modes.  
7. **Profile themes** = user motifs via `ProfileDecorationBackdrop` / `ThemedPageShell` patterns — do not reintroduce unrelated global theme systems.  
8. **Canonical genres only** in chips; manual genres optional, capped (see `genreVocabulary.ts` and pickers).  
9. **Shelf labels** exactly: Currently Reading, Finished, Want to Read.  
10. Prefer **small, incremental** diffs; match existing code style.  
11. **Do not edit** `.cursor/plans/` unless the user explicitly asks.  
12. **Do not commit** unless the user explicitly asks.  
13. After **substantive code** changes: run `npm run lint`, `npm test`, and `npm run build` from `app/`. **Markdown-only doc edits** do not require those commands.

---

**Document maintenance:** This file is the single canonical PRD for the shipped app. `Reading_Nook_Product_PRD.md` in `docs/` points here so older links stay valid.
