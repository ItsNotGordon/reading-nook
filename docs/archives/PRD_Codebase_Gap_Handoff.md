# Reading Nook — PRD vs Codebase Gap Analysis (Handoff)

**Generated:** June 1, 2026  
**Purpose:** Handoff document for ChatGPT or other collaborators. Lists everything that differs between the **canonical PRD** and the **shipped Next.js app** in `app/`.  
**Rule of thumb:** When this doc and the PRD disagree with code, **code is what users actually see** unless you are explicitly aligning code to the PRD.

---

## Canonical PRD

| Document | Role |
| -------- | ---- |
| [`docs/Reading_Nook_Product_PRD_Current_Updated_v2.md`](./Reading_Nook_Product_PRD_Current_Updated_v2.md) | **Full canonical spec** (navigation, routes, data model, Supabase, features) |
| [`docs/Reading_Nook_Product_PRD.md`](./Reading_Nook_Product_PRD.md) | Pointer/alias to the file above |
| [`docs/PRD.md`](./PRD.md) | Index (note: links to `_Current.md` which redirects to `_Updated_v2`) |

**Historical PRDs** (`docs/archives/*`, `Reading_Nook_PRD.md`, etc.) are outdated — do not use for current product decisions.

---

## Executive summary — highest-impact gaps

| # | Area | PRD says | Code does |
|---|------|----------|-----------|
| 1 | **Book detail layout** | Large **centered** cover (148×220), centered title/author, no description block | **Horizontal** header (AddToShelf-style): small cover left, title/author/**description** right with More/Less; sentiment/progress centered below |
| 2 | **Fourth shelf (DNF)** | Three shelves only: Want / Reading / Finished | **Four shelves** including `did_not_finish` ("Did Not Finish") across library, add flow, ratings, move shelf, feed |
| 3 | **Profile themes** | **8 themes**: plant, coffee, matcha, cats, galaxy, raindrops, sakura, vinyl | **12 themes**; `plant` renamed to `garden`; added sunroom, citrus, kintsugi, observatory; **4 dark themes** with full UI tokens |
| 4 | **Social graph** | Friendship-centric: `friendships` table, accepted friends see libraries | **Follows + friendships**: `follows` table, `profiles.is_public`, one-way follow on public accounts; **library/taste gated on mutual follows**, not friendship rows alone |
| 5 | **Migrations** | 16 migrations (`001`–`016`) | **17 migrations** — adds `017_follows_and_profile_visibility.sql` |
| 6 | **Cloud sync** | "Server always authoritative" / server wins on load | **Revision-based merge**: newer local revision can push instead of hydrate; race fixes for pending push after refresh |
| 7 | **Ratings page** | Finished-book rankings with URL filters `genre`, `author`, `q`, `bucket` | **Multi-shelf toggle** (Finished/Reading/Want/DNF) + **`sort` param**; genre/author filters are **URL-only** (from profile deep links, no pickers on page) |
| 8 | **Open Library naming** | `openLibrary.ts` deleted; Google Books only | File deleted ✓, but **`enrichOpenLibraryBook.ts`** still exists and is imported (calls `/api/books/work` — Google Books under the hood) |
| 9 | **Settings extras** | Library backup import/export documented | Also ships **Goodreads CSV import** (not in PRD) |
| 10 | **Home tab** | Social feed + Friends/Clubs quick access | Also shows **"Continue Reading"** row (up to 3 in-progress books) |

---

## 1. Navigation & routes

### Matches PRD

- Bottom tabs: **Home | Library | Add | Ratings | Profile** (`app/src/components/BottomNav.tsx`)
- `/` → `/home`, `/recs` → redirect `/add`, `/leaderboard` → replace `/ratings`
- Clubs at `/clubs`, `/clubs/create`, `/clubs/[clubId]` — **not** a bottom tab
- All major routes in PRD §3 exist under `app/src/app/`

### Differs from PRD

| Topic | PRD | Code | Paths |
|-------|-----|------|-------|
| Friends route highlighting | Not specified | `/friends` and `/friends/[username]` **highlight the Home tab** | `BottomNav.tsx` L117 |
| Leaderboard redirect | Legacy redirect only | Page **briefly renders** a "Leaderboard" shell before `router.replace("/ratings")` | `app/src/app/(tabs)/leaderboard/page.tsx` |
| Club routes | Not bottom-nav | Club routes do **not** highlight any bottom tab (expected) | `BottomNav.tsx` |

---

## 2. BookDetailSheet

### PRD §6a specification

1. Close button top-right  
2. **Large centered cover** 148×220  
3. Centered title (serif)  
4. Centered author  
5. Sentiment pill (finished)  
6. Progress bar (reading)  
7. Date line  
8. Genres (editable)  
9. Notes (editable)  
10. Four action buttons  
11. Remove from library  

**No description** in the PRD layout.

### Current code

| Feature | PRD | Code |
|---------|-----|------|
| Header layout | Centered large cover | **76×114 cover left**, title/author/description **right** (matches `AddToShelfSheet` pattern) |
| Description | Not documented | Shown with `line-clamp-4`, **More/Less** when >180 chars |
| Description enrichment | Not documented | On open, if empty, calls `enrichBook()` and persists via `updateCatalogDescription` |
| Privacy toggle | Owner-only control | Present but uses **native checkbox**, not the switch UI PRD specifies for add-to-shelf |
| Share sentiment to feed | Not in §6a | **`ShareSentimentToFeedToggle`** when changing feeling on finished books |
| DNF shelf actions | Not documented (3 shelves) | **"Start reading"** action when shelf is `did_not_finish` |

**Key files:** `app/src/components/BookDetailSheet.tsx`, `app/src/lib/enrichOpenLibraryBook.ts`, `app/src/lib/app-reducer.ts` (`UPDATE_CATALOG_DESCRIPTION`)

**Legacy:** `RatedBookDetailSheet.tsx` still exists but has **zero imports** in active views (PRD correctly marks it superseded).

---

## 3. Shelves & DNF (`did_not_finish`)

### PRD

- `Shelf = "want_to_read" | "reading" | "finished"`
- Library order: Currently Reading → Finished → Want to Read
- Add-to-shelf: three square shelf cards
- Feed events: `shelved | progress | finished`

### Code

| Feature | Code reality | Paths |
|---------|--------------|-------|
| Fourth shelf | `"did_not_finish"` in `Shelf` type and `SHELVES` array | `app/src/lib/types.ts` |
| Library UI | Fourth **"Did Not Finish"** horizontal shelf section | `app/src/components/LibraryShelves.tsx` |
| Add flow | Three primary cards + **separate full-width DNF button** below | `app/src/components/AddToShelfSheet.tsx` |
| Move shelf | DNF included in move targets | `app/src/lib/shelves.ts`, `MoveShelfSheet.tsx` |
| Ratings | DNF is a **ratings shelf toggle** option | `RatingsShelfToggle.tsx`, `RatingsPageClient.tsx` |
| Feed | Client posts **`did_not_finish`** events; `FeedCard` renders them | `app-state.tsx`, `FeedCard.tsx` |
| Reducer | Moving to DNF **clears finished rating fields** | `app-reducer.ts`, `shelves.test.ts` |

**PRD action:** Either document DNF as shipped or remove from code — currently a major undocumented feature.

---

## 4. Ratings page (`/ratings`)

### PRD §8

- Personal finished-book view (not public leaderboard)
- URL params: `genre`, `author`, `q`, `bucket`
- Reorder mode within sentiment buckets
- Uses unified `BookDetailSheet`
- Derived score badge (not Beli-style circles)

### Code vs PRD

| Feature | PRD | Code |
|---------|-----|------|
| Scope | Finished books primarily | **Shelf toggle**: Finished (default), Reading, Want to Read, DNF |
| URL `sort` | Not documented | **`?sort=`** with per-shelf defaults and options (score, date, title, author, progress) — see `ratingsShelfSort.ts` |
| Shelf switch + sort | Not documented | Switching shelf **resets sort to that shelf's default** |
| Genre/author filters | Implied in-page filters | Params **work** but UI pickers are **not on `/ratings`** — only set via profile deep links (`ProfileFavoritesSection`) |
| Text search `q` | Documented | Search input; applies on **Enter** (not live as-you-type) |
| `bucket` filter | Documented | Sentiment chips on **finished shelf only** |
| Reorder mode | Documented | Present for finished + sentiment buckets |
| Compact toolbar | Not documented | Short shelf pills (Finished/Reading/Want/DNF), compact sort dropdown |

**Key files:** `RatingsPageClient.tsx`, `RatingsShelfToggle.tsx`, `RatingsShelfBookRow.tsx`, `RatingsSortSelect.tsx`, `ratingsShelfSort.ts`

---

## 5. Library page

| Feature | PRD | Code |
|---------|-----|------|
| Three shelf sections | Yes | **Four** (includes DNF) |
| Finished shelf | Full list | **Capped at 12 books** with "View all" → `/ratings` | `LibraryShelves.tsx` `FINISHED_PREVIEW_LIMIT = 12` |
| Drag-to-scroll, arrows, hover expand | Documented | Implemented |
| Unrated finished → FinishBookSheet | Documented | Implemented |
| Deep link `?shelf=` | Documented | Supports all four shelf values |

---

## 6. Add tab & recommendations

### Mostly matches PRD

- Unified search + For You recs on `/add`
- Google Books API routes: search, isbn, work, discover
- `AddToShelfSheet` cozy pattern (preview, shelf cards, private toggle, compact genres)
- `/recs` redirect stub
- Hybrid + TF-IDF engines labeled "For You" / "Similar Vibes"
- Discover cache, auto-refill pool, rate limit cooldown

### Differs

| Topic | PRD | Code |
|-------|-----|------|
| Shelf picker | 3 shelves | 3 cards + **DNF button** |
| Enrichment module name | Google Books / no Open Library file | **`enrichOpenLibraryBook.ts`** filename is legacy; uses `/api/books/work` |
| Book ID prefixes | `googlebooks:` + legacy `openlibrary:` | Both still supported in enrichment |

---

## 7. Home feed & social activity

### Matches PRD

- Merged reverse-chronological feed (events + posts)
- Friends + Clubs quick access with notification badges
- Post composer with book/club attachments
- Threaded comments (one level), comment likes, liked-by preview
- Clickable book cards → `BookDetailSheet` or `FeedBookPreviewSheet`
- Private book sanitization pattern

### Code-only / differs

| Feature | PRD | Code |
|---------|-----|------|
| Continue Reading | Not documented | Up to **3 in-progress books** + link to library on Home | `home/page.tsx` |
| Event types | shelved, progress, finished | Also **`did_not_finish`**, **`sentiment_update`** |
| Sentiment share | Not documented | Opt-in **`ShareSentimentToFeedToggle`** posts `sentiment_update` events (default off) |
| Post edit/delete UI | Three-dot menu | Iconized edit/delete on own posts (recent polish) |

---

## 8. Profile, settings & themes

### Profile (`/profile`) — mostly matches

- Hero with display name, username heading, tagline, avatar, Edit/Settings links
- Stats, favorite book, genres, authors, insights, shelf snapshots
- Following/followers counts → `SocialConnectionsSheet`
- Favorite book opens `BookDetailSheet`
- Decorations via `ProfileDecorationBackdrop` (not `ThemedPageShell` import — PRD notes this)

### Settings (`/profile/settings`) — PRD partial

| Feature | PRD | Code |
|---------|-----|------|
| Library backup | Documented | `LibraryBackupSection` — export/import JSON |
| Goodreads import | **Not in PRD** | **`GoodreadsImportSection`** — CSV import with `goodreads-import:` book IDs | `goodreadsImport.ts`, `GoodreadsImportSection.tsx` |
| Profile visibility | **Not in PRD** | Public/private account toggle via `/api/profile/visibility` | `profile/settings`, migration 017 |

### Themes — major drift

**PRD (8 themes):** plant, coffee, matcha, cats, galaxy, raindrops, sakura, vinyl

**Code (12 themes in `AppTheme`):**

| Theme | Notes |
|-------|-------|
| matcha, coffee, galaxy, raindrops, sakura, vinyl | In both PRD and code |
| **garden** | Replaces PRD **`plant`** (`normalizeProfileTheme` maps `plant` → `garden`) |
| **sunroom, citrus** | Light themes — **not in PRD** |
| **kintsugi, observatory, garden, cats** | **Dark profile themes** (`darkProfile: true`) with extended `uiTokens` — **not in PRD** |
| cats palette | PRD: orange cozy light; code: **dark theme** with warm accents |

**Other theme diffs:**

- Edit profile picker: **12 themes**, 4-column grid (PRD says 8)
- Edit profile copy says decorations are **"Profile only"** — contradicts PRD §11 and actual `ThemedPageShell` usage on Library/Ratings/Add/etc.
- `ProfileThemeApplier` sets CSS vars including `--nav-muted`, `data-profile-mode` for dark themes — beyond PRD scope
- Random theme on first load: matches PRD

**Key files:** `app/src/lib/profileTheme.ts`, `app/src/lib/types.ts`, `ProfileThemeApplier.tsx`, `EditProfileSheet.tsx`

---

## 9. Friends & social graph — major drift

### PRD §10

- `friendships` table with pending/accepted
- Accepted friends always see each other's library (migration 004)
- `/friends` for requests and discovery
- `/friends/[username]` full-page friend profile
- Follower/following counts via service-role client on friendships

### Code reality

| Feature | PRD | Code |
|---------|-----|------|
| Library/taste access | Accepted **friendship** | **`assertMutualFollow`** — requires **mutual follows** in `follows` table | `friendAccess.ts` |
| Follow model | Implied symmetric friends | **Asymmetric follows** + mutual follow = "friends" for library access |
| Public profiles | Not documented | `profiles.is_public` — can follow public accounts without friend request |
| Follow API | Not in PRD table | `POST/DELETE /api/users/[username]/follow` |
| Visibility API | Not in PRD | `GET/PATCH /api/profile/visibility` |
| Followers/following lists | Via `/api/users/[username]/friends` | Also **`/api/friends/followers`**, **`/api/friends/following`** |
| Friends list API | GET/POST `/api/friends` | Also **`PATCH /api/friends`** for accept/decline/cancel |
| Profile copy | Friends-scale, no viral mechanics | Profile explains: *"Friends follow each other back. Following and follower counts can differ."* |
| Friend profile UX | Library + insights | Also **Follow/Unfollow**, **Add friend**, **`FriendBookCompareSheet`** (shared rated book comparison) |
| Taste comparison | Friend taste API | `buildTasteComparison`, `FriendCompareTaste`, cross-provider ID matching (Google Books + Goodreads import IDs) |

**Migration 017** (`017_follows_and_profile_visibility.sql`):

- Adds `profiles.is_public`
- Creates `follows` table with RLS
- Backfills mutual follows from accepted friendships

**PRD action:** Section 10 and API table need a full rewrite for follows + public profiles.

---

## 10. Book clubs

**Largely aligned** with PRD §11:

- Create, join (invite code), list, detail, members, feed, cross-posting, club icons, pending invites, notification badges
- `is_club_member` SECURITY DEFINER function
- Storage bucket `club-icons`

No major undocumented club features found beyond what migration 017 adds for general social (not club-specific).

---

## 11. Cloud sync & persistence

### PRD

- Server-authoritative; server wins on page load
- localStorage `reading-nook-v1` as write-through cache
- 500ms debounced push
- No conflict dialog (`SyncConflictSheet` removed)
- Empty server + local data → auto-push on first login

### Code

| Feature | PRD | Code |
|---------|-----|------|
| Conflict UI | Removed | **Confirmed deleted** — no `SyncConflictSheet.tsx` |
| Server wins | Always | **Revision-based**: if local revision is newer than pulled server, **local pushes** instead of hydrate |
| Race fix | Not documented | Pending debounced push flushed after refresh completes |
| Resume refresh | Not detailed | 20s throttle on focus/visibility |
| Debounce | 500ms | Matches (`PUSH_DEBOUNCE_MS = 500`) |

**Key files:** `SyncStatusProvider.tsx`, `cloudSync.ts`, `storage.ts` (`isRevisionNewer`)

---

## 12. Data model & types

### AppState — matches PRD

```ts
{ version, catalog, userBooks, bucketRankings, profile, dismissedRecIds, blacklistedTitleWords }
```

### Shelf type — differs

- **PRD:** 3 values  
- **Code:** 4 values including `did_not_finish`

### UserBook — matches PRD + visibility

Includes `visibility: "public" | "private"` per PRD private books section.

### New reducer action — not in PRD

- `UPDATE_CATALOG_DESCRIPTION` / `updateCatalogDescription` — persists enriched descriptions from detail sheet

### Book ID prefixes — matches PRD note

- `googlebooks:` (primary), `openlibrary:` (legacy), `goodreads-import:` (Goodreads CSV — **not in PRD**)

---

## 13. Supabase migrations

### PRD documents 16 migrations (001–016)

### Code has 17

| Migration | In PRD | Purpose |
|-----------|--------|---------|
| 001–016 | Yes | As documented in PRD §15 |
| **017_follows_and_profile_visibility.sql** | **No** | `profiles.is_public`, `follows` table, RLS, backfill from friendships |

All files: `supabase/migrations/`

---

## 14. API routes

### PRD table routes — all present in code ✓

Full list in PRD §3 "API routes (complete)" — verified under `app/src/app/api/`.

### Routes in code NOT in PRD table

| Route | Purpose |
|-------|---------|
| `GET /api/friends/followers` | Signed-in user's followers |
| `GET /api/friends/following` | Signed-in user's following |
| `GET`, `PATCH /api/profile/visibility` | Account public/private |
| `POST`, `DELETE /api/users/[username]/follow` | Follow/unfollow public accounts |
| `PATCH /api/friends` | Accept/decline/cancel friend requests |

### Behavioral diffs on documented routes

| Route | PRD behavior | Code behavior |
|-------|--------------|---------------|
| `/api/friends/[friendId]/library` (and profile, taste) | Accepted friendship | **Mutual follow** required |
| `/api/users/[username]/friends` | Full friend list | Supports `?list=following` / `?list=followers` |
| `/api/feed/events` POST | shelved, progress, finished | Also **`sentiment_update`**, **`did_not_finish`** |

---

## 15. Private books

**Mostly matches PRD §4** — server-side sanitization, owner sees full metadata, friends see "Private book / Hidden" placeholders.

Verify sanitizer usage on all friend/feed/club paths when changing code; PRD requirement that client-only hiding is insufficient still applies.

---

## 16. Progress tracking

**Matches PRD §13:**

- Estimated: 2×2 band tiles in `ProgressUpdateSheet`
- Exact: current page + total pages even when catalog `totalPages === 0`
- `updateReadingExactProgress` updates catalog + userBook

---

## 17. Legacy & reference (PRD §16)

| Asset | PRD status | Code status |
|-------|------------|-------------|
| `openLibrary.ts` | Deleted | **Confirmed absent** |
| `enrichOpenLibraryBook.ts` | Not mentioned | **Still exists** (misleading name) |
| `MagicLinkAuthForm.tsx` | Deleted | **Confirmed absent** |
| `SyncConflictSheet.tsx` | Deleted | **Confirmed absent** |
| `RatedBookDetailSheet.tsx` | Superseded, file exists | **Exists, unused** |
| Goodbooks JSON / Python recommender | Reference only | Not live UI source ✓ |
| `/recs`, `/leaderboard` | Redirect stubs | Present ✓ |

---

## 18. Code-only features (not in PRD at all)

Use this list when updating the PRD or scoping new work:

1. **Did Not Finish shelf** — full product surface (library, add, ratings, move, feed, reducer logic)
2. **Ratings multi-shelf view** + `sort` URL param + compact toolbar
3. **12 profile themes** including 4 dark themes + UI tokens
4. **Follows + public profiles** (migration 017, follow APIs, visibility API)
5. **Goodreads CSV import** in Settings
6. **Home "Continue Reading"** section
7. **`sentiment_update` feed events** with opt-in share toggle
8. **Friend book compare sheet** (`FriendBookCompareSheet`)
9. **Taste comparison** across providers including Goodreads import IDs
10. **`updateCatalogDescription`** for lazy description enrichment
11. **Library finished preview cap** (12 books)
12. **Friends routes highlight Home tab** in bottom nav

---

## 19. PRD claims that still match code ✓

- Bottom nav: Home, Library, Add, Ratings, Profile
- No star ratings; sentiment buckets + pairwise ranking
- Google Books for search/discover (not Goodbooks JSON live pool)
- Supabase required; Google OAuth only; mandatory login
- Unified `BookDetailSheet` (conceptually — layout differs)
- `AddToShelfSheet` cozy pattern for unadded books
- Book clubs feature set (create, join, feed, icons, invites, cross-post)
- Feed: posts, events, reactions, threaded comments, comment likes
- Private books with server sanitization
- Profile backup in Settings
- Pairwise comparison, finish flow, progress sheets
- Recommendation engines (hybrid + tfidf) with documented UI labels
- 500ms sync debounce, no conflict sheet
- Canonical genre vocabulary

---

## 20. Suggested PRD update priorities

If aligning documentation to shipped app (recommended order):

1. Add **DNF shelf** everywhere shelves are documented  
2. Rewrite **BookDetailSheet §6a** (horizontal layout + description + enrichment)  
3. Rewrite **§10 Friends** for follows + public profiles + migration 017  
4. Update **§12 Theming** to 12 themes + dark mode + `plant`→`garden`  
5. Update **§8 Ratings** for multi-shelf toggle + `sort` param  
6. Add **§15 migration 017** and new API routes  
7. Clarify **sync revision merge** (not pure "server always wins")  
8. Document **Goodreads import**, **Continue Reading**, **sentiment_update** events  
9. Rename or document **`enrichOpenLibraryBook.ts`**  
10. Fix **EditProfileSheet** copy ("Profile only" vs cross-tab theming)

---

## 21. Key file index (for ChatGPT context)

| Area | Primary files |
|------|----------------|
| PRD | `docs/Reading_Nook_Product_PRD_Current_Updated_v2.md` |
| Types / AppState | `app/src/lib/types.ts` |
| Reducer | `app/src/lib/app-reducer.ts` |
| Client state | `app/src/lib/app-state.tsx` |
| Sync | `app/src/components/SyncStatusProvider.tsx`, `app/src/lib/cloudSync.ts` |
| Shelves | `app/src/lib/shelves.ts` |
| Book detail | `app/src/components/BookDetailSheet.tsx` |
| Add to shelf | `app/src/components/AddToShelfSheet.tsx` |
| Library | `app/src/components/LibraryShelves.tsx` |
| Ratings | `app/src/components/RatingsPageClient.tsx` |
| Themes | `app/src/lib/profileTheme.ts`, `ProfileThemeApplier.tsx` |
| Friends access | `app/src/lib/friendAccess.ts`, `app/src/lib/socialGraph.ts` |
| Feed | `app/src/components/FeedCard.tsx`, `app/src/components/HomeFeed.tsx` |
| Enrichment | `app/src/lib/enrichOpenLibraryBook.ts`, `app/src/lib/bookProviders/googleBooks.ts` |
| Goodreads import | `app/src/lib/goodreadsImport.ts`, `GoodreadsImportSection.tsx` |
| Migrations | `supabase/migrations/001`–`017` |
| Nav | `app/src/components/BottomNav.tsx` |

---

## 22. How to use this with ChatGPT

Paste this entire document and add your goal, for example:

- *"Update the PRD to match sections 1–10 of the gap analysis"*  
- *"Revert BookDetailSheet to PRD centered layout"*  
- *"Document DNF shelf in the PRD without changing code"*  
- *"Explain the follows vs friendships model to a new developer"*

Always specify **whether PRD or code should win** for each conflict — they intentionally diverge in several shipped areas.

---

*End of handoff document.*
