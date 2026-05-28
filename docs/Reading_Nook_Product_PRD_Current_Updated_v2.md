# Reading Nook — Product PRD (current shipped app)

**Status:** Canonical product specification — aligned with the codebase in `app/`  
**Project:** Reading Nook  
**Primary platform:** Mobile-first web  
**Stack:** Next.js App Router (v16), React, TypeScript, Tailwind CSS  
**Backend:** **Supabase** is the **required** platform for auth, library sync, profiles (including `@username` and avatars), friendships, social feed, book clubs, and Row Level Security.  
**Canonical purpose:** Track books, rank finished reads by taste (not stars), discover titles via Google Books, connect with a small circle of friends, participate in book clubs, and optionally keep sensitive books private.

Reading Nook should feel like a cozy reading companion, not a social feed and not a machine-learning demo.

---

## 1. Product Overview

Reading Nook is a small, mobile-first reading tracker for personal use and a **friends-scale** social layer backed by Supabase.

It combines:

- **Goodreads-style shelves** (Want to Read, Currently Reading, Finished)  
- **Beli-style sentiment** (`liked` / `okay` / `disliked`) and **pairwise ranking** inside buckets to derive numeric scores  
- **Google Books API** for live search, work enrichment, and recommendation candidates (migrated from Open Library due to persistent 403 errors)  
- **Client-side, app-state recommendations** ("For You") from catalog + Google Books discover — **not** the legacy Goodbooks JSON pool as the live source  
- **Social feed** with posts, reactions, threaded comments, and comment likes  
- **Book clubs** with invite-code joining, club feeds, and cross-posting from the home feed
- **Private books** that remain fully visible to the owner but are anonymized on friend/social surfaces

**Philosophy (ratings):** No star ratings. Users express **how a finished book felt** and **which book they liked more** in pairwise steps; numeric scores are derived from bucket + rank.

**Philosophy (social):** Friends are lightweight — a personal home feed of shelf activity and user posts, but no followers or viral mechanics. Friend libraries are visible only in the context of accepted friendships and server-enforced policies.

---

## 2. Current Architecture

### Repository layout


| Area                                                     | Role                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `app/`                                                   | **Next.js product app** — all shipped UI, API routes, and client state                           |
| `supabase/migrations/`                                   | SQL migrations applied to the hosted Supabase project (**sixteen** migration files: `001`–`016`) |
| `docs/`                                                  | Product and setup documentation (`SUPABASE_SETUP.md`, `DEPLOY.md`, this PRD)                     |
| `notebook.ipynb`, `recommender/`, `git-forked-database/` | Legacy / reference (see §16)                                                                     |


### Runtime model

- **Client app state** lives in React (`ReadingNookProvider` + reducer). Canonical TypeScript types are in `app/src/lib/types.ts`.  
- **Persistence (server-authoritative):** Supabase is the **source of truth**. `localStorage` key `reading-nook-v1` serves as a **write-through cache** for fast startup renders — on page load, cached state is displayed immediately, then the server copy overwrites it. All mutations are optimistic (dispatched locally for instant UI), then pushed to the server within 500ms.  
- **Hydration safety:** `ReadingNookProvider` exposes a `ready` flag (`false` during SSR, `true` after localStorage state is loaded). `ThemedPageShell` defers rendering children and the decoration backdrop until `ready` to prevent SSR/client hydration mismatches.  
- **Cloud sync:** `/api/sync` reads/writes a per-user JSON `libraries.state` row and merges `profiles` fields (`display_name`, `tagline`; username and avatar via dedicated APIs). On login/page load, `SyncStatusProvider` always fetches from the server and hydrates (server wins — no conflict dialog). If the server is empty but local data exists, it auto-pushes.  
- **Friends:** Friendship rows in `public.friendships`; profile discovery and friend library/taste via `/api/friends`, `/api/users/`*, and related routes under `app/src/app/api/`. Follower/following counts use a **service-role Supabase client** to bypass RLS for accurate counts across all users.  
- **Social feed:** Feed events (`feed_events`) and user posts (`posts`) with reactions (`post_reactions`, `event_reactions`), one-level **threaded comments** (comments + replies via `parent_id`), and **comment likes** (`comment_likes`). Shelving activity, progress updates, finished-with-rating events, and free-form posts appear on the Home tab (`/home`). Users can like/comment on both posts and events; feed cards use liked-by preview text such as `Liked by @username and 2 others`.  
- **Book privacy:** Per-user book visibility lives on `UserBook`. Private books remain fully visible to the owner, but friend/feed/club/profile responses must sanitize title, author, cover, genres, description, and notes before returning data to non-owners.  
- **Book clubs:** Clubs (`clubs`) with members (`club_members`), invite-code joining, club-specific feeds, pending invitations, club icons, unread badges, and cross-posting from the home feed via optional `club_id` on posts.  
- **Google Books API rate limiting:** Server-side caching of discover results in `discover_cache` table (24-hour TTL) and client-side 5-minute cooldown to prevent hitting the 100 req/min rate limit.

### Main navigation (bottom tabs)

```txt
Home | Library | Add | Ratings | Profile
```

**Home** shows the social feed (§5). **Ratings** is both a shipped route (`/ratings`) and a bottom-nav tab for finished-book rankings (§8). **Clubs** remains a shipped book-club route (`/clubs`) accessible from Home and other club entry points, but is not currently a bottom-nav tab.

**Nested highlighting:** `BottomNav` treats a tab as active when `pathname === href` **or** `pathname.startsWith(href + "/")`, so e.g. `/ratings` highlights **Ratings**, and `/profile/settings` highlights **Profile**. Club routes remain reachable but do not correspond to a bottom-nav tab.

### Routes (shipped)


| Path                  | Behavior                                                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | Redirects to `/home`                                                                                                                    |
| `/home`               | Home feed — social activity from friends and self, new post composer, clickable book cards                                              |
| `/library`            | Library shelves with drag-to-scroll, arrow navigation, hover-expand book cards, unified book detail sheet                               |
| `/ratings`            | Finished books, filters, derived scores, book detail sheets                                                                             |
| `/add`                | **Unified** Google Books search + "For You" recommendations + shelf picker + finish flow                                                |
| `/clubs`              | **Book clubs** — list of user's clubs, create club, join club by invite code                                                            |
| `/clubs/create`       | Create a new book club with name, description, privacy setting, and optional current book                                               |
| `/clubs/[clubId]`     | Club detail page — header, current book, members, club-scoped feed with post composer                                                   |
| `/friends`            | Friends list, requests, discovery (Supabase-backed when configured)                                                                     |
| `/friends/[username]` | **Route-based friend profile** (not a modal sheet); self-username redirects to `/profile`; invalid usernames show a minimal error state |
| `/profile`            | Profile stats, hero, insights, viewable follower/following lists                                                                        |
| `/profile/settings`   | **Settings** shell: account-oriented actions and **library backup** import/export where implemented                                     |
| `/login`              | Sign-in entry (Google OAuth only — mandatory before accessing any other route)                                                          |
| `/auth/callback`      | OAuth / auth callback handler                                                                                                           |
| `/recs`               | **Not a product surface** — immediately `redirect("/add")`                                                                              |
| `/leaderboard`        | Client `router.replace("/ratings")` — legacy path only                                                                                  |


### API routes (complete)


| Route                                  | Method(s)          | Purpose                                                                                                                   |
| -------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `/api/sync`                            | GET, POST          | Read/write per-user library AppState JSON                                                                                 |
| `/api/books/search`                    | GET                | Search Google Books by query string                                                                                       |
| `/api/books/isbn`                      | GET                | Look up a book by ISBN via Google Books                                                                                   |
| `/api/books/work`                      | GET                | Fetch detailed work/edition info from Google Books                                                                        |
| `/api/books/discover`                  | GET                | Discover books by genre from Google Books with server-side caching (`discover_cache` table)                               |
| `/api/feed`                            | GET                | Merged reverse-chronological feed of events + posts with profiles, reactions, comments, comment likes, and liker previews |
| `/api/feed/events`                     | POST               | Create feed events (shelved, progress, finished)                                                                          |
| `/api/feed/events/[eventId]/react`     | POST               | Toggle like reaction on a feed event                                                                                      |
| `/api/feed/posts`                      | POST               | Create a new post (with optional book attachment and optional `club_id` for cross-posting)                                |
| `/api/feed/posts/[postId]`             | PATCH, DELETE      | Edit or delete own manual post                                                                                            |
| `/api/feed/posts/[postId]/react`       | POST               | Toggle like reaction or add comment on a post (supports `parent_id` for threaded replies)                                 |
| `/api/feed/comments/[reactionId]/like` | POST               | Toggle like on an individual comment or reply                                                                             |
| `/api/friends`                         | GET, POST          | List friends / send friend request                                                                                        |
| `/api/friends/[friendId]/library`      | GET                | Fetch friend's library JSON with private-book sanitization                                                                |
| `/api/friends/[friendId]/profile`      | GET                | Fetch friend's profile info with private-book-safe summaries                                                              |
| `/api/friends/[friendId]/taste`        | GET                | Fetch friend's taste/rating data with private-book sanitization                                                           |
| `/api/profile/username`                | GET, PATCH         | Get or set the user's @username                                                                                           |
| `/api/profile/avatar`                  | GET, POST          | Get or upload the user's avatar                                                                                           |
| `/api/users/search`                    | GET                | Search for users by username prefix                                                                                       |
| `/api/users/[username]`                | GET                | Fetch public profile info for a user by username (includes follower/following counts via service-role client)             |
| `/api/users/[username]/friends`        | GET                | Fetch a user's full list of accepted friends (service-role client to bypass RLS)                                          |
| `/api/notifications/summary`           | GET                | In-app badge counts: `friends` (pending incoming requests), `clubs` (unread invites + unread club feed posts)             |
| `/api/clubs`                           | GET, POST          | List user's clubs / create a new club                                                                                     |
| `/api/clubs/[clubId]`                  | GET, PATCH, DELETE | Fetch club detail / update club info (admin) / delete club (creator)                                                      |
| `/api/clubs/[clubId]/icon`             | GET, PATCH, DELETE | Club icon URL (member read); upload/remove icon (admin) via `club-icons` Storage bucket                                   |
| `/api/clubs/[clubId]/join`             | POST               | Join a public club or validate invite code for private clubs                                                              |
| `/api/clubs/[clubId]/members`          | POST               | Send a pending club invite by @username (admins always; members when `members_can_invite` is enabled)                     |
| `/api/clubs/invites`                   | GET                | List pending incoming club invitations for the signed-in user                                                             |
| `/api/clubs/invites/[inviteId]`        | PATCH              | Accept or decline a club invitation (`action`: `accept`                                                                   |
| `/api/clubs/[clubId]/seen`             | POST               | Mark club feed read (`last_feed_seen_at`) for members                                                                     |
| `/api/clubs/[clubId]/leave`            | DELETE             | Leave a club                                                                                                              |
| `/api/clubs/[clubId]/feed`             | GET                | Fetch a club's feed (posts filtered by `club_id`, enriched with profiles/reactions/comments)                              |
| `/api/clubs/join/[code]`               | GET                | Resolve an invite code to club information                                                                                |


### Key components


| Component                    | Purpose                                                                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AddToShelfSheet`            | Shared add-to-shelf UI for unadded books — book preview, square shelf cards (bookmark/open book/book-check), reversible private-book toggle, compact genre preview, and nested genre editing.                                                  |
| `BookDetailSheet`            | **Unified** book detail view for all shelves — centered cover, title/author, sentiment pill or progress bar, owner-only privacy control, genres, notes, icon action buttons, and remove from library.                                          |
| `FeedCard`                   | Renders individual feed items (events or posts) with author links, clickable book cards, timestamps, liked-by preview text, like/comment controls, and threaded comments. Own manual posts use a subtle three-dot action menu for edit/delete. |
| `CommentSection`             | Collapsible threaded comments with one-level replies, inline avatars, timestamps, comment likes, delete own, pill-shaped input with circular send button, and indented reply styling.                                                          |
| `FeedBookPreviewSheet`       | Lightweight preview for books from the feed not in user's library; uses the shared add-to-shelf pattern with cover/title/author/description, shelf cards, private toggle, and compact genres.                                                  |
| `HomeFeed`                   | Home feed container with post composer, feed cards, book detail/preview sheet integration.                                                                                                                                                     |
| `NewPostComposer`            | Post creation with text body, optional book attachment (via `BookPickerSheet`), optional club attachment (via `ClubPickerSheet`).                                                                                                              |
| `BookPickerSheet`            | Bottom sheet to select a book from user's library — search box, categorized by shelf, explicit close button. Private books should not leak through friend/club-visible attachments.                                                            |
| `ClubPickerSheet`            | Bottom sheet to select a club to attach to a post.                                                                                                                                                                                             |
| `ClubCard`                   | Club summary card — optional club icon (else current book cover or default book icon), name, description, member count, public/private badge.                                                                                                  |
| `ClubIcon`                   | Rounded-square club image with default book SVG fallback.                                                                                                                                                                                      |
| `ClubIconPicker`             | Admin crop/upload flow for club icon (mirrors profile photo picker).                                                                                                                                                                           |
| `JoinClubSheet`              | Sheet for joining a club via invite code — lookup, preview, and join flow.                                                                                                                                                                     |
| `InviteClubMemberSection`    | Username search + send pending invite on club detail.                                                                                                                                                                                          |
| `ClubInvitesPanel`           | Pending club invitations on `/clubs` with club icon, Accept / Decline.                                                                                                                                                                         |
| `NotificationBadge`          | Red count pill (`9+` cap) on Home Friends/Clubs quick-access buttons.                                                                                                                                                                          |
| `NotificationCountsProvider` | Polls `/api/notifications/summary` every 45s + on window focus; wraps tab layout.                                                                                                                                                              |
| `BookCard`                   | Individual book card in library shelves — cover, title, author, progress/score info, click opens `BookDetailSheet`, hover-expand effect, drag-safe.                                                                                            |
| `ShelfSection`               | Horizontal shelf row with drag-to-scroll, left/right arrow buttons, `data-dragging` attribute for interaction safety.                                                                                                                          |
| `LibraryShelves`             | Library page body — all three shelf sections with unified book detail sheet integration and first-time finish flow.                                                                                                                            |
| `SocialConnectionsSheet`     | View following/followers list on any profile (own or friend's).                                                                                                                                                                                |
| `FriendProfileView`          | Full friend profile with social tallies, clickable follower/following counts, library, insights.                                                                                                                                               |
| `RatedBookDetailSheet`       | **Legacy** — still exists in codebase but superseded by `BookDetailSheet` in all active views.                                                                                                                                                 |
| `FinishBookSheet`            | First-time rating flow when a finished book hasn't been rated yet (sentiment choice + pairwise trigger).                                                                                                                                       |
| `ProgressUpdateSheet`        | Update reading progress (estimated band or exact page count).                                                                                                                                                                                  |
| `PairwiseComparisonSheet`    | Pairwise comparison flow for ranking books within a sentiment bucket.                                                                                                                                                                          |
| `MoveShelfSheet`             | Move a book between shelves while preserving privacy.                                                                                                                                                                                          |
| `SentimentPicker`            | Three-option sentiment selector (liked / okay / disliked).                                                                                                                                                                                     |
| `GenreChipPicker`            | Searchable genre chip selector with canonical vocabulary.                                                                                                                                                                                      |


### Supabase status

Supabase is **required** for this product: profiles, library JSON sync, friendships, social feed, book clubs, storage (avatars), and RLS policies are defined in migrations `001_reading_nook.sql` through `016_club_icon.sql`.

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

Authoritative definitions: `app/src/lib/types.ts`. Summaries below are descriptive; if this PRD and code disagree, **code wins**.

### `Book`

Catalog metadata: `id`, `title`, `author`, `coverUrl`, `totalPages` (`0` means unknown), `genres`, `description`, optional API-derived fields (`publishedYear`, `averageRating`, `ratingsCount`, `readinglogCount`). Book IDs use a provider prefix: `googlebooks:` for Google Books entries, `openlibrary:` for legacy Open Library entries (both supported for backward compatibility).

### `Shelf`

`"want_to_read" | "reading" | "finished"` — UI labels: **Want to Read**, **Currently Reading**, **Finished**.

### `UserBook`

Per-user copy: `shelf`, `visibility` (`public` | `private`), `progressMode` (`exact` | `estimated`), `currentPage`, `estimatedRange`, finish timestamps (`finishedAt`, `finishedSortAt`), sentiment `sentimentBucket`, `derivedScore`, `addedAt`, `notes`.

`visibility` is per-user, not catalog-level: the same catalog book can be public for one user and private for another. New shelf additions default to `public`, and the owner can toggle a book private/public at any time.

### `BucketRankings`

`Record<SentimentBucket, BookId[]>` — ordered IDs per bucket; **pairwise insertion** (`PairwiseComparisonSheet`) updates these orders.

### `UserProfile` (local state)

`displayName`, `tagline`, `theme` (`plant` | `coffee` | `matcha` | `cats` | `galaxy` | `raindrops` | `sakura` | `vinyl`). Cloud `profiles` row adds `username` and `avatar_url` (not duplicated inside `AppState` JSON — fetched via `/api/profile/username` and `/api/profile/avatar`).

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

### Supabase tables (migrations 001–016)

- `**profiles`:** `id` (auth user), `display_name`, `tagline`, `username`, `avatar_url`, `share_shelves` — user identity and display preferences.  
- `**libraries`:** `user_id`, `state` (jsonb app snapshot), `updated_at` — persisted AppState JSON. `UserBook.visibility` lives inside this JSON state for per-book privacy.  
- `**friendships`:** `requester_id`, `addressee_id`, `status` (`pending` | `accepted`) — bidirectional friend relationships.  
- `**feed_events`:** `user_id`, `event_type` (`shelved` | `progress` | `finished`), `book_id`, `book_title`, `book_cover_url`, `book_author`, `shelf`, `sentiment`, `derived_score`, `progress`, `notes`, `created_at` — auto-generated from user library actions. Private-book events must be sanitized for non-owners before being returned from APIs.  
- `**posts`:** `user_id`, `body`, `book_id`/`book_title`/`book_cover_url`/`book_author` (optional book attachment), `club_id` (optional club cross-post reference), `created_at`, `updated_at` — user-authored free-form posts.  
- `**post_reactions`:** `post_id`, `user_id`, `reaction`, `body` (for comments), `parent_id` (for threaded replies), `created_at` — reactions and comments on posts.  
- `**event_reactions`:** `event_id`, `user_id`, `reaction`, `body` (for comments), `parent_id` (for threaded replies), `created_at` — reactions and comments on feed events.  
- `**discover_cache`:** `genre`, `page`, `results` (jsonb), `fetched_at` — server-side cache for Google Books discover results (24-hour TTL). RLS enabled with no policies (service-role access only).  
- `**comment_likes`:** `id`, `reaction_id`, `reaction_source` (`post` | `event`), `user_id`, `created_at` — per-comment/reply like tracking.  
- `**clubs`:** `id`, `name`, `description`, `creator_id`, `is_public`, `members_can_invite`, `invite_code`, `icon_url`, `current_book_id`/`current_book_title`/`current_book_cover_url`/`current_book_author`, `created_at` — book club definitions.  
- `**club_members`:** `club_id`, `user_id`, `role` (`member` | `admin`), `joined_at`, `last_feed_seen_at` — club membership and unread-feed tracking.  
- `**club_invites`:** `club_id`, `inviter_id`, `invitee_id`, `status` (`pending` | `accepted` | `declined` | `cancelled`), `created_at` — pending username-based club invitations.  
- `**notifications`:** `user_id`, `type` (`club_invite`, legacy `club_added`), `club_id`, `actor_id`, `read_at`, `created_at` — in-app badge counts and notification metadata.  
- **Storage bucket `avatars`:** public read, user-scoped write policies (`003_profiles_avatar.sql`).  
- **Storage bucket `club-icons`:** public read, admin-scoped club icon uploads (`016_club_icon.sql`).

### RLS policies and `SECURITY DEFINER` functions

- All tables have **Row Level Security** enabled with appropriate policies.  
- `**public.is_club_member(p_club_id, p_user_id)`** — a `SECURITY DEFINER` SQL function that checks club membership without triggering RLS recursion. Used in `clubs_select`, `club_members_select`, and `posts_select_club` policies. Created in migration `012_clubs_fix_recursion.sql` to fix an infinite recursion bug in the original `011_clubs.sql` policies.  
- **Service-role client** is used server-side (via `SUPABASE_SERVICE_ROLE_KEY`) to bypass RLS for operations like: discover cache reads/writes, friendship count queries (accurate counts across all users), fetching friend lists for profile views, club feed fetching, and club member counts.

---

### Private books

Reading Nook supports reversible per-book privacy so users can keep sensitive books in their own shelves, stats, ratings, and recommendations without exposing the real metadata to friends or club/social surfaces.

**Owner behavior:**

- New books default to **public**.  
- The owner can toggle a book between **public** and **private** at any time.  
- Private books remain fully visible to the owner: real title, author, cover, genres, description, notes, shelf, progress, sentiment, derived score, and ranking all continue to work normally.  
- Moving shelves, updating progress, editing notes/genres, and finishing/rating a book must preserve its visibility value.

**Friend/social behavior:**

For non-owner viewers, private books must be sanitized before data leaves the API layer. The friend-facing placeholder is:

```txt
Private book
Hidden
```

Private-book placeholders should use a generic/private cover treatment and must not reveal real title, author, cover, genres, description, notes, or other identifying metadata.

Private books may still contribute to safe generic totals, but friend-facing top genres, top authors, favorite book, feed cards, club posts, and taste summaries must not leak private metadata.

**Surface rules:**

- **Friend library/profile/taste:** show anonymized private-book placeholders where appropriate; do not expose real metadata.  
- **Home feed and club feed:** private shelf/progress/finished events should read as private-book activity, e.g. "finished a private book," and should not show notes or real book details.  
- **Book attachments:** private books should not be exposed through post/club attachment pickers unless the resulting post is also safely anonymized.  
- **Manual posts:** remain editable/deletable by the owner; automatic feed events are activity history and are not individually removable by default.

Use a shared viewer-aware sanitizer, conceptually:

```ts
sanitizeBookForViewer({ book, userBook, viewerIsOwner })
```

All friend/social/server responses must apply privacy at the API/data-shaping layer, not only in client UI.

## 5. Home Feed

### Overview

`/home` is the default landing tab — a merged, reverse-chronological feed of activity from the signed-in user and their accepted friends. The page also features **Friends** and **Clubs** quick-access buttons at the top, each with an **in-app notification badge** (red count + subtle ring when > 0): **Friends** = pending incoming friend requests; **Clubs** = pending incoming club invitations plus new club feed posts since `last_feed_seen_at`. Counts poll via `GET /api/notifications/summary` (no push notifications).

### Feed items


| Type         | Source                                          | Display                                                                                                                                      |
| ------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shelved**  | User moves a book to a shelf                    | "[User] added [Book] to [Shelf]" with clickable book card                                                                                    |
| **Progress** | User updates reading progress                   | "[User] is reading [Book]" with visual progress bar (upserted — only the latest progress event per book is kept)                             |
| **Finished** | User rates a finished book via pairwise ranking | "[User] finished [Book]" with a custom derived-score badge colored by sentiment bucket; private books are anonymized for non-owners          |
| **Post**     | User writes a free-form post                    | Text body, optional attached book card, optional club badge ("in ClubName"), like/comment controls, three-dot edit/delete menu for own posts |


### Feed cards

- Author names link to `/friends/[username]` profile pages (clickable profile links for friend discovery). Clicking on your own username routes to `/profile` instead.  
- Author display shows `@username` when available, falling back to display name.  
- Finished-book events show a **custom derived-score badge** (e.g. "8.5") with sentiment-bucket coloring (green for liked, amber for okay, red for disliked), matching the `/ratings` page without relying on Beli-style score circles.  
- **Clickable book cards:** All book thumbnails/info areas in feed items are clickable buttons. Clicking opens the `**BookDetailSheet`** if the book is in the current user's library, or the `**FeedBookPreviewSheet**` with the shared add-to-shelf sheet pattern if it's not. Private books use anonymized placeholders for non-owners.  
- Posts with a `club_id` display a pill badge linking to the club detail page (e.g. "in Book Lovers").  
- Users can **edit** and **delete** their own manual posts from the feed through a subtle three-dot menu. Automatic shelf/progress/finished events are not individually removable by default; users should use private-book visibility to hide sensitive book activity.

### Comments and reactions

- **Likes:** Users can like both posts and events via heart icon toggle (`post_reactions` / `event_reactions` tables). Feed cards use a liked-by text preview instead of only a number: `Like`, `Liked by @username`, or `Liked by @username and N others`. Usernames in liked-by text are clickable (`/profile` for self, `/friends/[username]` for others), and `N others` can open the liked-by list where implemented. Anyone who can view a post/event can view its likers within the same visibility boundary.  
- **Comments:** One-level **threaded comments** — top-level comments can have replies, but replies cannot have further replies. Comments have:  
  - Collapsible thread display ("View N comments" toggle)  
  - Inline avatar, username, and comment text on the same line  
  - Indented thread styling with a subtle guide line for replies/comments where expanded  
  - Timestamp ("2h ago") and action buttons below each comment  
  - **Reply** button that sets reply context and focuses the input  
  - **Delete** button on own comments/replies  
  - **Comment likes** — each comment/reply can be individually liked (heart icon with count, via `comment_likes` table and `/api/feed/comments/[reactionId]/like`)  
  - Pill-shaped input with circular send button  
  - Threaded replies are indented with a left border, smaller avatars (20px vs 32px)

### Implementation

- Events are **client-pushed** via `postFeedEvent()` in `app-state.tsx` whenever library actions fire (shelving, progress updates, pairwise ranking completion).  
- Posts are managed via `/api/feed/posts` (CRUD) and `/api/feed/posts/[postId]/react` (reactions/comments with `parent_id` for replies).  
- Event reactions via `/api/feed/events/[eventId]/react`.  
- The merged feed is fetched from `/api/feed` which combines `feed_events` and `posts` with profile data, reactions, comments (with nested replies), and comment like counts, sorted by `created_at`.  
- The `NewPostComposer` supports attaching a book (via `BookPickerSheet`) and/or a club (via `ClubPickerSheet`) to any post.

---

## 6. Library

- **Sections:** Currently Reading → Finished → Want to Read (display order).  
- **Cards:** Cover, title, author; reading progress for active reads; derived score / sentiment styling for finished items when present. All cards are clickable and open the unified `BookDetailSheet`.  
- **Sorting:** Finished by `finishedSortAt` / `finishedAt` / `addedAt`; other shelves newest `addedAt` first (see shelf helpers in codebase).  
- **Book Detail Sheet:** Unified detail view for all three shelves (see §6a below).  
- **Unrated finished books:** Clicking a finished book without a sentiment rating opens the `FinishBookSheet` first (first-time rating flow with sentiment choice + pairwise trigger).  
- **Deep link:** `/library?shelf=…` is used from profile shelf snapshots.

### 6a. Book Detail Sheet (`BookDetailSheet`)

A unified, centered-cover design replacing the old `RatedBookDetailSheet`. Opens when clicking any book card in the library, ratings page, or profile favorites. Layout top-to-bottom:

1. **Close button** (×) — top-right corner
2. **Large centered cover** — 148×220px, rounded corners, shadow
3. **Title** — centered, serif font, large
4. **Author** — centered, muted text
5. **Sentiment pill** (finished only) — rounded pill showing heart icon + "Liked"/"It was okay"/"Didn't like it" label + numeric score (e.g. "9.4"), colored by sentiment bucket (green/amber/red)
6. **Progress bar** (reading only) — horizontal bar with percentage label
7. **Date line** — calendar icon + "Finished Jan 4, 2026" / "Started …" / "Added …" depending on shelf
8. **Genres section** — "GENRES" uppercase label + "Edit" link, genre chips in a wrapping row, editable via `GenreChipPicker`
9. **Notes section** — "NOTES" uppercase label + "Edit" link, styled dashed-border note card with placeholder "No notes yet. Tap Edit to add your thoughts."
10. **Action buttons row** — 4 icon+label buttons adapting per shelf:
  - **Finished:** Change feeling (smiley), Move to shelf (book), Edit details (pencil), Add note (clipboard)
    - **Reading:** Update progress (bar chart), Move to shelf (book), Edit details (pencil), Add note (clipboard)
    - **Want to Read:** Start reading (play), Move to shelf (book), Edit details (pencil), Add note (clipboard)
11. **Remove from library** — red text button with trash icon at bottom

### 6b. Shelf UX (drag-to-scroll)

Library shelf rows support **horizontal drag-to-scroll** for desktop users (replacing traditional scrollbars):

- Custom `useDragScroll` hook handles mouse-based dragging with `pointer-events: none` on children during drag to prevent interference from book cover images.  
- **Left/right arrow buttons** appear on hover at shelf edges (visibility based on scroll position via `useScrollEdges` hook).  
- **Book card hover effect** — cards scale up 5% with shadow on hover (`hover:scale-105 hover:shadow-lg`), suppressed during active drag via `[[data-dragging]_&]` CSS selectors.  
- Hidden scrollbar (`scrollbar-none`) for clean appearance.

---

## 7. Add + Recommendations

### Add tab (`/add`)

Single surface: **one search field**, Google Books results (via internal API routes), **recommendation list**, genre chip filtering where implemented, shelf picker (with book description preview), and finish flow when **Finished** is chosen.

Search is **Google Books–first** (`app/src/app/api/books/search/route.ts`, `googleBooks.ts`). Results exclude books already in `userBooks` where implemented.

### Add-to-shelf / unadded-book sheet

Unadded books opened from `/add` or from feed preview surfaces use a shared cozy sheet pattern:

1. **Header:** `Add to shelf` with close X.
2. **Book preview:** cover, title, author, truncated description, and a `More` expand/collapse control.
3. **Choose a shelf:** three square rounded shelf cards in one row: **Want to Read** (bookmark), **Currently Reading** (open book), **Finished** (book + checkmark). Selected/active state uses a soft green border/background.
4. **Private book:** proper switch/toggle, not a browser checkbox. Helper copy: "Only you can see the title, cover, notes, and details."
5. **Genres:** compact preview only by default — max 3 chips plus `+N`; `Edit genres` opens or expands the canonical genre picker. The full chip grid is hidden until the user explicitly edits genres.
6. **No redundant footer:** avoid a large Add/Cancel footer when shelf card taps perform the add action. The close X handles dismiss/cancel, and selecting **Finished** preserves the existing finish/rating flow.

The sheet must fit and scroll on small mobile screens without cutting off the genres section or safe-area content. Existing descriptions and genres from Google Books/search/feed preview data must be preserved when the redesign maps a search result into a catalog book.

### "For You" recommendations (live)

Built from `app/src/lib/appNativeRecommendations.ts` using `hybridAprioriKnnRecommend` (`app/src/lib/recommender/`) plus taste signals from finished books — candidates from **unshelved catalog** and **Google Books discover** when the catalog pool is small (`APP_NATIVE_SOURCE_DISCOVER`, threshold in `appNativeRecommendations.ts`).

**Rules:** Hide shelved books and dismissed IDs (`dismissedRecIds`); do **not** depend on Goodbooks JSON for live UI.

### Discover pool and auto-refill

The discover endpoint (`/api/books/discover`) fetches **1 batch of 40 books per genre** across the user's top 2 genres (2 Google Books API calls per page), producing quality candidates after filtering. Results are **cached server-side** in the `discover_cache` table with a 24-hour TTL to minimize API calls. The endpoint uses a service-role Supabase client for cache operations.

Candidates are filtered for: `ratingsCount > 0` (when present), `publishedYear >= 1900`, non-empty description, and `totalPages >= 100` (to exclude children's picture books).

The client pool (`useRecommendationsPool`) **auto-refills**: when `notShelvedRecs.length` drops below 10, the hook fetches the next page of discover results and merges them in, up to 2 pages maximum. A **client-side 5-minute cooldown** (`RATE_LIMIT_COOLDOWN_MS`) prevents rapid-fire discover requests after hitting HTTP 429. `RECS_POOL_MAX` is **120**; `RECS_VISIBLE_COUNT` is **10** (shuffled from the pool).

### Genre enrichment

Google Books categories are often sparse (e.g. just `"Fiction"`). The system enriches genres via two methods:

1. **Category segment mapping:** Each Google Books category string (e.g. `"Fiction / Science Fiction / General"`) is split on `/` and each segment is mapped through `genreVocabulary.ts` canonical labels.
2. **Description-based extraction:** Book descriptions are scanned for genre keywords (e.g. "dystopian", "romance", "thriller") to supplement sparse categories. Rules are defined in `googleBooks.ts` (`DESC_GENRE_RULES`).

### Recommendation system display names


| Internal engine          | UI label          | Description                                                                                                                         |
| ------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `hybrid` (Apriori + KNN) | **For You**       | Personalized recommendations blending genre affinity mining, sentiment-based nearest-neighbor scoring, and Google Books popularity. |
| `tfidf`                  | **Similar Vibes** | Recommendations based on genre and author term overlap with the user's finished books.                                              |


The internal engine identifiers (`hybrid`, `tfidf`) and algorithm implementations are unchanged; only the labels shown to users were updated.

### `/recs`

**Not a product route** — exists only as a **redirect to `/add`** (`app/src/app/(tabs)/recs/page.tsx`). Do not document a standalone Recs tab.

---

## 8. Ratings

`/ratings` is the personal finished-book view (not a public leaderboard): ranked lists, derived scores, sentiment styling, text search, genre/author filters, URL query params `genre`, `author`, `q`, `bucket` (`RatingsPageClient`), editable detail flows via `BookDetailSheet`. Includes reorder mode for manually reranking books within sentiment buckets.

**Navigation:** `/ratings` is both a shipped route and a bottom-nav tab.

**Score display:** The left-side rank/order number remains a small circle. The derived score itself should avoid Beli-style colored circles; the current design direction uses a bookish custom badge treatment (book-spine/open-book exploration) with sentiment coloring. Final badge styling can continue to be refined, but do not revert the derived score to a Beli-like score circle without explicit direction.

**Legacy:** `/leaderboard` replaces to `/ratings`; avoid "Leaderboard" in primary nav copy.

## 9. Profile + Settings

### Profile (`/profile`)

- **Hero (`ProfileHeroCard`):** **Display name** in the **upper corner**; when signed in with a username set, the **main heading** shows the **username without a literal `@` prefix**; otherwise prompts to set username or falls back to display name. Tagline, avatar (when signed in), **Edit profile** and **Settings** links.  
- **Body:** Stats, favorite book, genres, authors, sentiment insights, shelf snapshot links, etc. — **without** pushing account management and **library backup** into the main scroll (those live under **Settings**).  
- **Social tallies:** Following and followers counts with clickable numbers that open `SocialConnectionsSheet` showing the full friend list. Counts are fetched via the friends API.  
- **Favorite book click:** Clicking the favorite book on the profile opens the `BookDetailSheet`.  
- **Theming:** Profile page uses `PageShell` plus inline `ProfileDecorationBackdrop` for the same decorative themes as other tabs (see §11 — implementation detail differs from `ThemedPageShell` import but visuals align).

### Settings (`/profile/settings`)

Wrapped in `ThemedPageShell` with title **Settings**. Hosts **account** controls and **library backup** import/export (`LibraryBackupSection` and related), isolated from the main profile marketing/stats experience.

### Edit Profile sheet

Owns display name, tagline, theme picker (8 themes in a 4-column grid), cloud `@username`, avatar upload, and destructive local resets as implemented (`EditProfileSheet`, profile API routes).

---

## 10. Friends

### Data + access

- Friend relationships are stored in `friendships` with RLS limited to participants.  
- **Migration `004`:** Accepted friends may **always** read each other's `libraries` row (library JSON) — the earlier `share_shelves`-gated friend read on libraries was **dropped**; `share_shelves` default was set to **true** for backward compatibility but **friend library visibility is not product-gated on that flag anymore** for accepted pairs.  
- **Follower/following counts:** Use a **service-role Supabase client** (`app/src/lib/friendshipCounts.ts`) to bypass RLS and return accurate counts across all users. This fixes a bug where friend profiles showed incorrect 1/1 counts because the authenticated client could only see friendships involving the current user.

### UX

- `/friends`: Pending/accepted lists, send requests, search users by username (`/api/users/search`, `/api/users/[username]`).  
- `/friends/[username]`: **Full-page friend profile** via `FriendProfileView` — **not** a modal sheet. **Self-username redirect:** If a user navigates to `/friends/[their-own-username]` (via comment link click or manual URL), they are redirected to `/profile`.  
- **Social connections:** Follower/following counts on friend profiles are clickable, opening `SocialConnectionsSheet` with the full friend list (fetched via `/api/users/[username]/friends` using service-role client).  
- **Insights (`FriendProfileInsights`):** When the friend has **ratings rows**, the **Finished** shelf subsection is **omitted** from the library area to avoid duplicating finished content already shown in ratings; the library section hides entirely if it would be empty.

### APIs

`GET`/`POST` `/api/friends`, friend-scoped `library`, `profile`, `taste` routes, `/api/users/[username]/friends` (service-role friend list) — all require Supabase + auth as implemented.

---

## 11. Book Clubs

### Overview

Book clubs are a social feature allowing users to create themed reading groups, share a "current book," and maintain a club-scoped feed separate from the home feed.

### Data model

- `**clubs` table:** `id`, `name`, `description`, `creator_id`, `is_public` (boolean), `members_can_invite` (boolean, default false — creator can allow any member to invite by username), `invite_code` (auto-generated 8-char unique string), `icon_url` (nullable — public `club-icons` Storage object), `current_book_id`/`current_book_title`/`current_book_cover_url`/`current_book_author` (nullable), `created_at`.  
- `**club_members` table:** `club_id`, `user_id`, `role` (`member` | `admin` — creator is auto-added as admin), `joined_at`, `last_feed_seen_at` (for unread club feed badge). Unique constraint on `(club_id, user_id)`.  
- `**club_invites` table:** `club_id`, `inviter_id`, `invitee_id`, `status` (`pending` | `accepted` | `declined` | `cancelled`), `created_at`. Username invites create `pending` rows; membership starts only after **accept**. Unique `(club_id, invitee_id)`.  
- `**notifications` table:** `user_id`, `type` (`club_invite`, legacy `club_added`), `club_id`, `actor_id`, `read_at`, `created_at`.  
- `**posts.club_id`:** Optional foreign key to `clubs(id)` with `ON DELETE SET NULL`, allowing posts to be cross-posted to a club feed.

### RLS and security

- RLS policies use a `SECURITY DEFINER` function `public.is_club_member(p_club_id, p_user_id)` to check membership without triggering infinite recursion in policy evaluation.  
- Public clubs are visible to all authenticated users; private clubs are visible only to members and the creator.  
- Members can view club details, other members, and the club feed. Only members can post to a club.  
- Club creator can update club info (name, description, current book) and delete the club.

### UX flow

1. **Clubs page (`/clubs`):** Lists the user's clubs as `ClubCard` components (name, description preview, member count, current book thumbnail, public/private badge). Two action buttons: "Create Club" (links to `/clubs/create`) and "Join Club" (opens `JoinClubSheet`).
2. **Create club (`/clubs/create`):** Form with club name, description, public/private toggle, and optional book picker for setting the initial current book.
3. **Join club (`JoinClubSheet`):** Enter an invite code → lookup → preview (name + member count) → join. Works for both public and private clubs.
4. **Club detail (`/clubs/[clubId]`):** Header (name, description, member count, privacy badge), current book section (with admin book-change controls via `BookPickerSheet`), members list (collapsible), invite code (copyable), leave/delete buttons, and club-scoped feed with `NewPostComposer` and `FeedCard`s (including clickable books).

### Cross-posting

When composing a post on the home feed, users can optionally **attach a club** via the `ClubPickerSheet` (similar to the "Attach a book" button). This sets `club_id` on the post, causing it to appear in both the home feed and the club's feed. Posts with a `club_id` display a pill badge ("in ClubName") linking to the club.

When posting directly from within a club detail page, the `club_id` is automatically set to that club.

---

## 12. Theming

- User-selectable `AppTheme`: `plant`, `coffee`, `matcha`, `cats`, `galaxy`, `raindrops`, `sakura`, `vinyl` (8 themes).  
- **New accounts** are assigned a **random theme** on first load (client-side, after hydration) to encourage discovery of theme options when comparing with friends.  
- Each theme defines a **nav color palette** (accent, accentSoft, border, barBg, activeShadow), a **background gradient**, **decoration image slots**, and a **preview image** for the picker.  
- **Library, Ratings, Add, Friends list, Friend profile, Clubs, and Settings** use `ThemedPageShell`, which applies `ProfileDecorationBackdrop` using `state.profile.theme`. `ThemedPageShell` defers rendering children until the `ready` flag is true to avoid SSR hydration mismatches.  
- **Profile tab** applies the same `ProfileDecorationBackdrop` inside `PageShell` (no `ThemedPageShell` import on that page — intentional layout for hero + scroll).  
- **Bottom nav** accent tokens (`--nav-accent`, etc.) follow the active profile theme via CSS variables (`ProfileThemeApplier` / related).  
- **Intent:** Decorative motifs are tied to the user's profile theme and appear across primary tabs for a cohesive "nook" — not arbitrary global app skins.

**Shelf icon map:** Want to Read = bookmark; Currently Reading = open book; Finished = book with checkmark. Use the same simple line-icon style wherever shelf icons appear (add-to-shelf, move shelf, detail actions, feed indicators, or shelf headers).

**Clubs icon direction:** Clubs should use a cozy reading-nook/window motif where possible (arched window, cushion/book/plant), matching the Friends icon style with a soft green circular background and dark green line art.


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

## 13. Progress Tracking

Applies to **Currently Reading** (`shelf === "reading"`).

### Estimated

User picks one of four canonical fraction bands (e.g. 0–25%, …). Stored as `estimatedRange: [lo, hi]`. **UI:** compact **2×2 grid of rectangular tiles** (percent label + short qualitative label) in `ProgressUpdateSheet`.

### Exact

**Always available** in the sheet: user may enter **Current page** (left) and **Total pages** (right) even when catalog `totalPages === 0` (common for API-sourced books). Saving calls `updateReadingExactProgress`, which updates **both** the catalog copy's `totalPages` and the `UserBook` exact progress fields (`UPDATE_READING_EXACT_PROGRESS` in `app-reducer.ts`).

Progress bars elsewhere should remain readable on small screens (exact fill vs estimated band treatment in shelf cards — see components under `LibraryShelves` / book cards).

---

## 14. Deployment / Env

- **Vercel (or similar):** Project **root directory = `app/`** (see `docs/DEPLOY.md`, `app/vercel.json`).  
- **Build / verify (from `app/`):** `npm run dev`, `npm test`, `npm run lint`, `npm run build`.  
- **Environment:** Copy `app/.env.example` → `app/.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**required** — app enforces login). Optional `SUPABASE_SERVICE_ROLE_KEY` server-only (used for discover cache, friendship counts, friend list fetching, club operations). Set `GOOGLE_BOOKS_API_KEY` for book search and discover (free tier: 100 requests/minute, no daily cap).  
- **Without Supabase env:** App will **not function** — middleware forces login, and login requires Supabase + Google OAuth configuration.  
- **LAN testing:** `npm run dev -- --hostname 0.0.0.0 --port 3000` then open the host machine's IP on a phone.

---

## 15. Migration History

All migrations live in `supabase/migrations/`. They must be run in order against the Supabase project.


| Migration                              | Purpose                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `001_reading_nook.sql`                 | Core tables: `profiles`, `libraries`, `friendships` with RLS policies                                                                                         |
| `002_profiles_username.sql`            | Add `username` column to `profiles` with unique constraint                                                                                                    |
| `003_profiles_avatar.sql`              | Add `avatar_url` to `profiles`, create `avatars` storage bucket with policies                                                                                 |
| `004_friends_always_share_library.sql` | Drop `share_shelves` gate on friend library reads — accepted friends always see each other's library                                                          |
| `005_feed.sql`                         | Create `feed_events`, `posts`, `post_reactions` tables with RLS for the social feed                                                                           |
| `006_posts_update.sql`                 | Add `updated_at`, `book_author` columns to `posts`, add `body` and `parent_id` to `post_reactions` for comments                                               |
| `007_comment_replies.sql`              | Add `parent_id` column to `post_reactions` for one-level threaded replies (if not already added by 006)                                                       |
| `008_event_reactions.sql`              | Create `event_reactions` table (mirrors `post_reactions` structure) for likes and comments on feed events                                                     |
| `009_discover_cache.sql`               | Create `discover_cache` table for server-side caching of Google Books discover results                                                                        |
| `010_comment_likes.sql`                | Create `comment_likes` table for liking individual comments/replies on both posts and events                                                                  |
| `011_clubs.sql`                        | Create `clubs` and `club_members` tables, add `club_id` to `posts`, RLS policies, `is_club_member` function, indexes                                          |
| `012_clubs_fix_recursion.sql`          | Hotfix: recreate `is_club_member` as `SECURITY DEFINER` function and drop/recreate RLS policies to fix infinite recursion in `club_members` policy evaluation |
| `013_club_members_can_invite.sql`      | Add `members_can_invite` on `clubs` — creator can let non-admin members invite others by @username                                                            |
| `014_in_app_notifications.sql`         | `notifications` table (`club_added`), `club_members.last_feed_seen_at`, RLS for in-app badges on Home Friends/Clubs                                           |
| `015_club_invites.sql`                 | `club_invites` pending invitations; `club_invite` notification type; accept/decline before membership                                                         |
| `016_club_icon.sql`                    | `clubs.icon_url`; public `club-icons` Storage bucket; admin-only upload RLS                                                                                   |


## 16. Legacy / Reference Systems

Treat as **non-product sources** for live behavior:


| Asset                                         | Notes                                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `git-forked-database/` (Goodbooks CSVs)       | Historical corpus — **not** the live recommendation pool in the Next app                                                          |
| `recommender/` (Python)                       | Offline / experiments                                                                                                             |
| `notebook.ipynb`                              | STAT course artifact                                                                                                              |
| `app/src/lib/bookProviders/openLibrary.ts`    | **Deleted** — replaced by `googleBooks.ts`                                                                                        |
| `app/src/components/MagicLinkAuthForm.tsx`    | **Deleted** — email sign-in removed in favor of Google OAuth only                                                                 |
| `app/src/components/SyncConflictSheet.tsx`    | **Deleted** — server-authoritative model has no conflict resolution                                                               |
| `app/src/components/RatedBookDetailSheet.tsx` | **Superseded** — replaced by unified `BookDetailSheet.tsx` for all shelves; file still exists but is not imported by active views |
| `/recs` route                                 | Redirect stub only                                                                                                                |
| `/leaderboard`                                | Redirect-only legacy                                                                                                              |


Do not delete without explicit request; do not wire these back in as the primary user-facing recommendation source.

---

## 17. Cursor / Agent Rules

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
10. **BookDetailSheet** is the unified book detail view for all shelves — do not create shelf-specific detail sheets.
11. **Private books** must be sanitized server-side for friend/feed/club/profile views; never rely only on client-side hiding.
12. **Automatic feed events** are activity history and should not get individual delete controls by default; use private-book visibility for sensitive book activity.
13. **Add-to-shelf UI** should keep the cozy shared sheet pattern: book preview, square shelf cards, private toggle, compact genres, and hidden genre grid until edit.
14. **Comments** use one-level threading (`parent_id`) — replies cannot have further replies.
15. **Service-role client** pattern: use `getServiceClient()` or `createClient(url, serviceKey)` for operations that need to bypass RLS (counts, friend lists, cache, club feeds).
16. Prefer **small, incremental** diffs; match existing code style.
17. **Do not edit** `.cursor/plans/` unless the user explicitly asks.
18. **Do not commit** unless the user explicitly asks.
19. After **substantive code** changes: run `npm run lint`, `npm test`, and `npm run build` from `app/`. **Markdown-only doc edits** do not require those commands.

---

**Document maintenance:** This file is the single canonical PRD for the shipped app. `Reading_Nook_Product_PRD.md` in `docs/` points here so older links stay valid.