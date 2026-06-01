# Reading Nook — Product PRD (current shipped app)

**Status:** Canonical product specification — updated to align with the shipped codebase described in the PRD/codebase gap handoff.  
**Project:** Reading Nook  
**Primary platform:** Mobile-first web  
**Stack:** Next.js App Router (v16), React, TypeScript, Tailwind CSS  
**Backend:** **Supabase is required** for auth, library sync, profiles, public/private profile visibility, follows/friend access, social feed, book clubs, storage, and Row Level Security.  
**Canonical purpose:** Track books, rank finished reads by taste, discover titles through Google Books, connect with a small reading circle, participate in book clubs, import Goodreads history, and optionally keep sensitive books private.

Reading Nook should feel like a cozy reading companion: personal first, social second, and never a generic social network or machine-learning demo.

---

## 1. Product Overview

Reading Nook is a mobile-first reading tracker for personal use with a friends-scale social layer.

It combines:

- **Core reading shelves:** Want to Read, Currently Reading, Finished, and Did Not Finish.
- **Taste-based rankings:** sentiment buckets (`liked`, `okay`, `disliked`) plus pairwise comparison for finished books.
- **Derived scores:** users never manually assign stars; numeric scores come from bucket + rank.
- **Google Books search/discovery:** live catalog search, enrichment, recommendation candidates, and discover caching.
- **Goodreads CSV import:** users can port an existing Goodreads library into Reading Nook.
- **Recommendations:** app-state recommendations labeled **For You** and **Similar Vibes**; legacy Goodbooks files are reference only.
- **Home feed:** posts, shelf/progress/finished/DNF activity, sentiment-update events, likes, liked-by previews, threaded comments, replies, and comment likes.
- **Book clubs:** invite-code joining, username invites, club icons, unread badges, club feeds, and cross-posting.
- **Private books:** owner-visible books that are sanitized on friend/feed/club/profile surfaces.
- **Themes:** 12 cozy profile themes, including light/day themes and dark profile themes with broader UI tokens.

**Philosophy (ratings):** No star ratings. Users express how a finished book felt and compare books over time. Scores are derived from taste, not typed directly.

**Philosophy (social):** Reading Nook supports lightweight social discovery and small groups. Public profiles and follows exist, but library/taste access is intentionally stricter and depends on mutual following/friendship-style access.

---

## 2. Current Architecture

### Repository layout

| Area | Role |
| --- | --- |
| `app/` | Next.js product app — shipped UI, API routes, client state, and providers |
| `supabase/migrations/` | SQL migrations applied to Supabase, currently `001`–`018` |
| `docs/` | Product and setup documentation |
| `notebook.ipynb`, `recommender/`, `git-forked-database/` | Legacy/reference artifacts only |

### Runtime model

- **Client app state:** React provider/reducer (`ReadingNookProvider`, `app-reducer.ts`, `types.ts`).
- **Persistence:** Supabase `libraries.state` is the durable cloud copy. `localStorage` key `reading-nook-v1` remains a fast startup/write-through cache.
- **Optimistic UI:** client mutations update local state immediately and push to the server after a 500ms debounce.
- **Sync model:** not a pure “server always wins” overwrite. Sync uses revision-aware behavior: if the local revision is newer than the fetched server revision, local can push instead of being overwritten. Pending debounced pushes are flushed after refresh to avoid race-condition data loss.
- **Hydration safety:** `ReadingNookProvider.ready` and `ThemedPageShell` protect against SSR/client localStorage mismatch.
- **Resume refresh:** sync refreshes on focus/visibility with throttling to reduce PWA stale-cache issues.
- **Auth:** Google OAuth only. Login is mandatory.
- **Friends/social graph:** `follows` for one-way following; `friendships` for private-account approval requests; `profiles.is_public` for Instagram-style library visibility (public = open library; private = approved followers only). **Friends** (mutual follow) is colloquial labeling only—not a library gate.
- **Feed:** `feed_events`, `posts`, `post_reactions`, `event_reactions`, `comment_likes`; one-level threaded comments.
- **Privacy:** `UserBook.visibility` is per-user and must be enforced server-side for friend/feed/club/profile responses.
- **Clubs:** `clubs`, `club_members`, `club_invites`, `notifications`, `club-icons` storage, club feeds, and unread tracking.
- **Google Books rate limiting:** `discover_cache` table with 24-hour TTL plus client cooldown.

### Main navigation

```txt
Home | Library | Add | Ratings | Profile
```

- `/home` is the default landing tab.
- `/ratings` remains a bottom-nav tab and now supports multiple shelf list views, with Finished as default.
- `/clubs` is a shipped route but is **not** in the bottom nav.
- `/friends` and `/friends/[username]` are reachable social routes and highlight the Home tab in the shipped nav behavior.

### Routes

| Path | Behavior |
| --- | --- |
| `/` | Redirects to `/home` |
| `/home` | Home feed, Friends/Clubs quick-access buttons with badges, Continue Reading row, post composer, feed |
| `/library` | Horizontal shelves with drag-to-scroll, arrows, hover-scale book cards, unified book detail sheet |
| `/ratings` | Multi-shelf vertical list view; default Finished rankings; shelf toggles and sort controls |
| `/add` | Google Books search + recommendations + shared add-to-shelf sheet |
| `/clubs` | User clubs, pending invites, create/join entry points |
| `/clubs/create` | Create a club |
| `/clubs/[clubId]` | Club detail, current book, members, invite controls, club feed |
| `/friends` | Friend/follow discovery and request surfaces |
| `/friends/[username]` | Route-based profile view for another user; self username redirects to `/profile` |
| `/profile` | Own profile, stats, theme identity, social tallies, insights |
| `/profile/settings` | Account/settings, backup, Goodreads import, profile visibility |
| `/login` | Google OAuth sign-in |
| `/auth/callback` | OAuth callback |
| `/recs` | Redirects to `/add` |
| `/leaderboard` | Legacy redirect/replace to `/ratings` |

### API routes

| Route | Method(s) | Purpose |
| --- | --- | --- |
| `/api/sync` | GET, POST | Read/write per-user library AppState JSON |
| `/api/books/search` | GET | Search Google Books |
| `/api/books/isbn` | GET | Look up book by ISBN through Google Books |
| `/api/books/work` | GET | Fetch detailed Google Books work/edition info |
| `/api/books/discover` | GET | Discover books by genre with server-side cache |
| `/api/feed` | GET | Merged feed of events + posts with profiles, reactions, comments, comment likes, liker previews |
| `/api/feed/events` | POST | Create feed events: shelved, progress, finished, DNF, sentiment update |
| `/api/feed/events/[eventId]/react` | POST | Like/comment on feed events |
| `/api/feed/posts` | POST | Create posts with optional book and optional club |
| `/api/feed/posts/[postId]` | PATCH, DELETE | Edit/delete own manual posts |
| `/api/feed/posts/[postId]/react` | POST | Like/comment/reply on posts |
| `/api/feed/comments/[reactionId]/like` | POST | Like an individual comment or reply |
| `/api/friends` | GET, POST, PATCH | List/send/respond to friend requests as supported by current social UI |
| `/api/friends/followers` | GET | Signed-in user's followers |
| `/api/friends/following` | GET | Signed-in user's following |
| `/api/friends/[friendId]/library` | GET | Friend library with private-book sanitization and mutual-follow access checks |
| `/api/friends/[friendId]/profile` | GET | Friend profile summaries with privacy-safe shaping |
| `/api/friends/[friendId]/taste` | GET | Friend taste/rating data with privacy-safe shaping |
| `/api/profile/username` | GET, PATCH | Get/set username |
| `/api/profile/avatar` | GET, POST | Get/upload avatar |
| `/api/profile/visibility` | GET, PATCH | Get/set public/private account visibility |
| `/api/users/search` | GET | Search usernames |
| `/api/users/[username]` | GET | Fetch public profile data for username |
| `/api/users/[username]/follow` | POST, DELETE | Follow/unfollow public accounts |
| `/api/users/[username]/friends` | GET | Fetch following/follower/friend-style lists, including `?list=` variants where supported |
| `/api/notifications/summary` | GET | Home badge counts: incoming friend requests, club invites, unread club feed posts |
| `/api/clubs` | GET, POST | List/create clubs |
| `/api/clubs/[clubId]` | GET, PATCH, DELETE | Fetch/update/delete club |
| `/api/clubs/[clubId]/icon` | GET, PATCH, DELETE | Read/upload/remove club icon |
| `/api/clubs/[clubId]/join` | POST | Join via public club or invite code validation |
| `/api/clubs/[clubId]/members` | POST | Send username-based club invite |
| `/api/clubs/invites` | GET | Pending incoming club invites |
| `/api/clubs/invites/[inviteId]` | PATCH | Accept/decline club invite |
| `/api/clubs/[clubId]/seen` | POST | Mark club feed as read |
| `/api/clubs/[clubId]/leave` | DELETE | Leave club |
| `/api/clubs/[clubId]/feed` | GET | Club feed with post/reaction/comment enrichment |
| `/api/clubs/join/[code]` | GET | Resolve invite code to club info |

### Key components

| Component | Purpose |
| --- | --- |
| `AddToShelfSheet` | Shared unadded-book sheet: preview, shelf cards, DNF button, privacy toggle, compact genres |
| `BookDetailSheet` | Unified detail sheet for all shelves with horizontal header, description, status area, privacy, genres, notes, actions |
| `FeedCard` | Feed event/post card with author links, book cards, liked-by previews, reactions, comments, own-post edit/delete |
| `CommentSection` | Collapsible comments, one-level replies, comment likes, own-comment delete, pill input |
| `FeedBookPreviewSheet` | Preview for feed books not in current user's library, using shared add-to-shelf flow |
| `HomeFeed` | Home feed container and feed-sheet integration |
| `NewPostComposer` | Manual post composer with optional book and club attachment |
| `BookPickerSheet` | Pick a book from user's library |
| `ClubPickerSheet` | Pick a club for cross-posting |
| `ClubCard` / `ClubIcon` / `ClubIconPicker` | Club cards and icon management |
| `JoinClubSheet` / `ClubInvitesPanel` / `InviteClubMemberSection` | Join/invite flows |
| `NotificationBadge` / `NotificationCountsProvider` | In-app badge counts and polling |
| `BookCard` | Library shelf card with hover-scale and drag-safe behavior |
| `ShelfSection` | Horizontal shelf row with drag-to-scroll and arrows |
| `LibraryShelves` | All four library shelves, finished preview cap, BookDetailSheet integration |
| `RatingsPageClient` | Multi-shelf Ratings page with filters/search/sort/reorder where applicable |
| `RatingsShelfToggle` / `RatingsSortSelect` / `RatingsShelfBookRow` | Shelf toggles, sort selector, and vertical shelf rows |
| `SocialConnectionsSheet` | Followers/following lists |
| `FriendProfileView` | Friend/public profile page with follow actions, library/taste access, insights |
| `FriendBookCompareSheet` | Shared-rated-book comparison surface |
| `FinishBookSheet` | First-time finished rating flow |
| `ProgressUpdateSheet` | Reading progress update sheet |
| `PairwiseComparisonSheet` | Pairwise ranking insertion |
| `MoveShelfSheet` | Move between shelves while preserving privacy |
| `SentimentPicker` | Liked / okay / disliked selector |
| `GenreChipPicker` | Canonical genre selection |
| `GoodreadsImportSection` | Settings CSV importer for Goodreads libraries |
| `RatedBookDetailSheet` | Legacy, superseded and unused in active views |

---

## 3. Auth, Sync, and Supabase

### Supabase status

Supabase is required for the shipped app. Core migrations currently run from `001_reading_nook.sql` through `018_library_visibility_public_and_followers.sql`.

### Sign-in

- Google OAuth is the only sign-in method.
- Login is mandatory through middleware.
- Email magic link UI/code has been removed.

### Sync behavior

- `GET /api/sync` returns the per-user `AppState` JSON plus server metadata.
- `POST /api/sync` persists optimistic local changes.
- Local mutations are debounced by 500ms before cloud push.
- The old manual conflict dialog is gone.
- Sync is revision-aware: if local is newer than server, local can push; if server is newer, the client hydrates from server.
- Focus/visibility refresh is throttled and exists to reduce stale cached PWA behavior.
- If server data is empty but local data exists during first-login migration, local can be auto-pushed.

---

## 4. Core Data Model

Authoritative definitions live in `app/src/lib/types.ts`. If this PRD and code disagree, **code wins**.

### `Book`

Catalog metadata: `id`, `title`, `author`, `coverUrl`, `totalPages` (`0` means unknown), `genres`, `description`, optional API-derived fields (`publishedYear`, `averageRating`, `ratingsCount`, `readinglogCount`).

Supported ID prefixes include:

- `googlebooks:` — primary live catalog source
- `openlibrary:` — legacy/backward compatibility only
- `goodreads-import:` — Goodreads CSV imports that may not yet be matched to Google Books

### `Shelf`

```ts
"want_to_read" | "reading" | "finished" | "did_not_finish"
```

UI labels must be exactly:

- **Want to Read**
- **Currently Reading**
- **Finished**
- **Did Not Finish**

### `UserBook`

Per-user book relationship:

- `shelf`
- `visibility`: `public` | `private`
- `progressMode`: `exact` | `estimated`
- `currentPage`
- `estimatedRange`
- `finishedAt`
- `finishedSortAt`
- `sentimentBucket`
- `derivedScore`
- `addedAt`
- `notes`

When a book moves to `did_not_finish`, finished-only fields are cleared/ignored and the book is removed from bucket rankings.

### `BucketRankings`

```ts
Record<SentimentBucket, BookId[]>
```

Only finished/rated books participate in pairwise ranking.

### `UserProfile`

Local state includes `displayName`, `tagline`, and `theme`. Cloud profile fields include username, avatar URL, and public/private visibility. Theme values in code currently include 12 theme keys; see §12.

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

### Supabase tables

| Table/storage | Purpose |
| --- | --- |
| `profiles` | User profile, username, avatar, public/private visibility, legacy share fields |
| `libraries` | Persisted `AppState` JSON and `updated_at` |
| `friendships` | Legacy/request-based friendship rows |
| `follows` | Asymmetric following; mutual follows unlock private library/taste access |
| `feed_events` | Auto-generated shelf/progress/finished/DNF/sentiment activity |
| `posts` | Manual posts with optional book and optional club attachment |
| `post_reactions` | Post likes/comments/replies |
| `event_reactions` | Event likes/comments/replies |
| `comment_likes` | Likes on comments/replies |
| `discover_cache` | Server-side Google Books discover cache |
| `clubs` | Club definitions, privacy, invite code, icon, current book |
| `club_members` | Club membership, roles, unread feed tracking |
| `club_invites` | Pending/accepted/declined/cancelled username-based club invites |
| `notifications` | Club/friend badge metadata |
| `avatars` storage | Public avatars, user-scoped writes |
| `club-icons` storage | Public club icons, admin-scoped writes |

### RLS and service-role use

- RLS is enabled for Supabase tables.
- `public.is_club_member(p_club_id, p_user_id)` is a `SECURITY DEFINER` helper to avoid recursive club RLS checks.
- Server-side service-role clients are used only where needed: counts, friend/follow lists, discover cache, club feed/member counts, and other backend-only trusted operations.

---

## 5. Private Books

Reading Nook supports reversible per-book privacy.

### Owner behavior

- New additions default to public.
- The owner can toggle a book public/private at any time.
- Private books remain fully visible to the owner, including title, author, cover, notes, genres, progress, sentiment, score, and ranking.
- Moving shelves, editing notes/genres, updating progress, importing, and finishing/rating should preserve visibility.

### Non-owner behavior

For friend/feed/club/profile viewers, private books are sanitized before data leaves the API layer.

Placeholder copy:

```txt
Private book
Hidden
```

Private placeholders must not leak title, author, cover URL, genres, description, notes, or identifying metadata. Private books may contribute only to safe generic totals.

### Surface rules

- Friend library/profile/taste responses must sanitize private books.
- Home and club feeds should describe private activity generically, for example “finished a private book.”
- Private notes are never shown to non-owners.
- Book attachments should not leak private metadata.
- Privacy must be enforced server-side, not only hidden in client UI.

Conceptual helper:

```ts
sanitizeBookForViewer({ book, userBook, viewerIsOwner })
```

---

## 6. Home Feed

### Overview

`/home` is the default landing page. It includes:

1. Friends and Clubs quick-access buttons with notification badges.
2. Continue Reading row, showing up to three in-progress books.
3. New post composer.
4. Reverse-chronological feed of the signed-in user and accessible social activity.

### Feed item types

| Type | Source | Display |
| --- | --- | --- |
| `shelved` | User moves/adds a book to a shelf | Added book to shelf |
| `progress` | User updates Currently Reading progress | Reading update with progress display; latest progress per book is upserted |
| `finished` | User finishes/rates a book | Finished activity with custom score badge when public/visible |
| `did_not_finish` | User moves a book to Did Not Finish | DNF activity without score |
| `sentiment_update` | User opts to share changed feeling/rating | Sentiment update activity, default off through share toggle |
| `post` | Manual post | Text body, optional book, optional club badge |

### Feed cards

- Author names/avatar links route to `/profile` for self and `/friends/[username]` for others.
- Author display prefers `@username`, falling back to display name.
- Book cards are clickable and open `BookDetailSheet` if already in the user's library or `FeedBookPreviewSheet` if not.
- Private books show placeholders to non-owners.
- Manual posts owned by the current user have iconized edit/delete controls.
- Automatic events are not individually deletable by default; privacy controls are the intended way to hide sensitive book activity.

### Likes, comments, and liked-by preview

- Posts and events support likes.
- Liked-by text replaces a bare count where possible: `Like`, `Liked by @username`, `Liked by @username and N others`.
- Names in liked-by previews/lists route to profiles.
- Comments support one-level replies.
- Comments/replies support likes.
- Own comments/replies can be deleted.
- Reply threads use compact indentation/guide-line styling.

---

## 7. Library

### Shelves

Library displays four shelf sections in this order:

1. Currently Reading
2. Finished
3. Want to Read
4. Did Not Finish

### Behavior

- Shelf rows are horizontal, draggable on desktop, swipeable on mobile, and have left/right arrows.
- Book cards show cover, title, author, and shelf-specific metadata.
- Finished shelf cards show sentiment/score when available.
- Reading shelf cards show progress.
- DNF books do not show derived scores.
- All cards open `BookDetailSheet`.
- Unrated finished books open the first-time `FinishBookSheet` flow.
- Finished shelf is capped at 12 books on Library, with “View all” linking to `/ratings`.
- Deep links like `/library?shelf=...` support all shipped shelf values.

### Sorting in Library

- Finished uses finished timestamps and deterministic fallbacks.
- Reading, Want to Read, and DNF use newest added first unless a more specific shelf timestamp exists in code.

### Shelf UX

- `useDragScroll` supports drag-to-scroll.
- During active drag, child pointer events are suppressed to avoid accidental clicks.
- `useScrollEdges` controls arrow visibility.
- `scrollbar-none` hides native scrollbars for cleaner visual design.
- Book hover-scale is suppressed while dragging.

---

## 8. Book Detail Sheet

`BookDetailSheet` is the unified active detail view for library, ratings, profile favorite, feed/library-owned books, and related surfaces.

### Current shipped layout

The current sheet uses a compact, AddToShelf-inspired horizontal header:

1. Close button.
2. Header row with small cover on the left, and title/author/description on the right.
3. Description supports line clamp and More/Less when long.
4. If description is missing, the sheet can lazily enrich it through `enrichBook()` / `/api/books/work` and persist via `updateCatalogDescription`.
5. Finished books show sentiment/score status below the header.
6. Reading books show progress status below the header.
7. DNF and Want to Read books show shelf/status context without derived score.
8. Owner-only privacy control.
9. Genres section with edit flow.
10. Notes section with edit flow.
11. Shelf-specific action buttons.
12. Remove from library action.

### Shelf-specific actions

- **Finished:** change feeling, move shelf, edit details, add/edit note; sentiment changes can optionally be shared to feed via `ShareSentimentToFeedToggle`.
- **Currently Reading:** update progress, move shelf, edit details, add/edit note.
- **Want to Read:** start reading, move shelf, edit details, add/edit note.
- **Did Not Finish:** start reading or move shelf, edit details, add/edit note.

### Legacy note

`RatedBookDetailSheet.tsx` still exists but is superseded and should not be reintroduced into active views without explicit direction.

---

## 9. Add + Recommendations

### Add tab

`/add` is the unified search and recommendation surface.

Users can:

- Search Google Books.
- Open an unadded book preview.
- Add to Want to Read, Currently Reading, Finished, or Did Not Finish.
- Mark a new book private before adding.
- Edit genres before adding.
- Start the finish/rating flow when adding directly to Finished.
- Browse For You and Similar Vibes recommendations.
- Dismiss recommendations.

### Shared add-to-shelf sheet

Unadded books opened from Add or feed preview use a shared sheet:

1. Header with close X.
2. Book preview: cover, title, author, description, More/Less.
3. Three primary square shelf cards: Want to Read, Currently Reading, Finished.
4. Separate full-width Did Not Finish action.
5. Private-book toggle.
6. Compact genre preview; edit reveals full canonical genre picker.
7. No redundant footer when shelf-card taps perform the action.

### Recommendations

| Internal engine | UI label | Purpose |
| --- | --- | --- |
| `hybrid` | For You | Genre affinity, sentiment/neighbor scoring, popularity blend |
| `tfidf` | Similar Vibes | Content/author/genre overlap with finished books |

Rules:

- Do not use legacy Goodbooks JSON as the live UI source.
- Hide shelved and dismissed candidates.
- DNF books are already in the user's library and should not appear as candidates.
- Open Library is not a live provider; use `app/src/lib/enrichBook.ts` (Google Books `/api/books/work`).

### Discover pool

- `/api/books/discover` uses Google Books and `discover_cache`.
- Current documented behavior: one batch of 40 per genre across top 2 genres, up to 2 pages, with cooldown for rate limits.
- `RECS_POOL_MAX = 120`; `RECS_VISIBLE_COUNT = 10`.

---

## 10. Ratings

`/ratings` is the personal vertical list/ranking area. It is not a public leaderboard.

### Default behavior

- Default shelf: **Finished**.
- Default sort for Finished: **score high to low**.
- Finished books retain ranking, sentiment buckets, derived scores, bucket filter, and reorder mode.

### Shelf toggle

The Ratings page supports vertical list views for:

- Finished
- Currently Reading
- Want to Read
- Did Not Finish

Non-finished shelves do **not** show recommendation scores or derived ranking scores.

### Sort options

The page supports `?sort=` and resets invalid sort choices when switching shelves.

Finished options:

- Score high to low / low to high
- Date finished newest / oldest
- Date added newest / oldest
- Title A–Z / Z–A
- Author A–Z / Z–A

Currently Reading options:

- Date added newest / oldest
- Progress most complete / least complete
- Title A–Z / Z–A
- Author A–Z / Z–A

Want to Read and Did Not Finish options:

- Date added newest / oldest
- Title A–Z / Z–A
- Author A–Z / Z–A

### Search and filters

- Text search query `q` applies through URL/search behavior.
- `bucket` filter applies only to Finished.
- `genre` and `author` URL params work, especially from profile deep links, but the page does not currently expose full genre/author picker UI.

### Score display

- Left-side rank/order number remains a small circle.
- Derived score should not use Beli-style colored score circles.
- Current design direction is a custom bookish badge treatment, such as book-spine/open-book-inspired badges, with sentiment coloring.

### Legacy

`/leaderboard` is redirect-only legacy. Avoid “Leaderboard” in primary product copy.

---

## 11. Profile + Settings

### Profile

`/profile` includes:

- Hero card with display name, username, avatar, tagline, Edit Profile, Settings.
- Stats, favorite book, genres, authors, insights, shelf snapshots.
- Social tallies for following/followers.
- Clickable follower/following counts opening `SocialConnectionsSheet`.
- Favorite book click opens `BookDetailSheet`.
- Profile decorations through `ProfileDecorationBackdrop`.

### Settings

`/profile/settings` includes:

- Account-oriented settings.
- Library JSON backup/import/export.
- Goodreads CSV import.
- Profile visibility toggle (public/private) through `/api/profile/visibility`.
- Other destructive or advanced account/library actions where implemented.

### Goodreads import

Goodreads import supports CSV import into Reading Nook. Imported records may use `goodreads-import:` IDs when not matched to Google Books. Imported books should preserve shelves/history as safely as possible and should not force users through pairwise ranking for large imports.

### Edit Profile

Edit Profile owns:

- Display name.
- Tagline.
- Theme picker.
- Username.
- Avatar upload.
- Local reset/destructive actions where implemented.

Note: shipped copy may still say decorations are “Profile only,” but themes are used beyond Profile via ThemedPageShell and nav tokens. Product copy should eventually be corrected.

---

## 12. Friends, Follows, and Public Profiles

### Model

Reading Nook uses Instagram-style account visibility plus a follow graph:

- **`follows`** — one-way edges (`follower_id` → `following_id`). Powers follower/following counts.
- **`friendships`** — approval workflow for **private** accounts only (`pending` → accept/decline). Not used for public accounts.
- **`profiles.is_public`** — account visibility. New users default to **private** (`false`).
- **Friends (colloquial)** — mutual follows (you follow each other). A social label only; **not** a permission gate for library access.

Migration `017_follows_and_profile_visibility.sql` adds follows and profile visibility. Migration `018_library_visibility_public_and_followers.sql` updates library RLS to match.

### Access rules

| Account type | Who can view library + ratings |
| --- | --- |
| **Public** (`is_public = true`) | Any signed-in user — no follow required (like public Instagram posts) |
| **Private** (`is_public = false`) | Only users the owner **approved** via follow request (one-way follow: requester → owner after accept) |
| **Self** | Always full access |

- Per-book `UserBook.visibility = private` still sanitizes individual titles for non-owners on all surfaces.
- Enforcement lives in `assertCanViewLibrary` / `canViewLibrary` ([`friendAccess.ts`](app/src/lib/friendAccess.ts)) and matching Supabase RLS on `libraries`.
- Service-role helpers may be used server-side for accurate counts/lists.

### UX

- **Public profiles:** Follow / Unfollow only (no “Add friend”). Library visible even without following.
- **Private profiles:** “Request to follow” → pending → accept creates one-way follow (requester can view library; owner does not auto-follow back).
- `/friends/[username]` is a full page; self username redirects to `/profile`.
- `GET /api/users/[username]` returns `canViewLibrary` for client gating.
- `FriendBookCompareSheet` and taste comparison load for any viewer with library access.

### APIs

Relevant APIs: `/api/friends` (private follow requests + accept/decline), `/api/friends/followers`, `/api/friends/following`, `/api/users/[username]/follow` (public accounts only), `/api/profile/visibility`, and friend-scoped `/api/friends/[friendId]/library|profile|taste`.

---

## 13. Book Clubs

### Overview

Book clubs are smaller reading groups with a club profile, current book, member list, invite system, and club-scoped feed.

### Data model

- `clubs`: name, description, creator, public/private, `members_can_invite`, invite code, icon URL, current book fields.
- `club_members`: role (`member` | `admin`), joined date, `last_feed_seen_at`.
- `club_invites`: pending username-based invitations.
- `notifications`: club invite/feed badge support.
- `posts.club_id`: optional club cross-post reference.

### UX

- `/clubs`: user clubs, pending invites, Create Club, Join Club.
- `/clubs/create`: create club with name/description/privacy/current book.
- Join flow: invite code lookup, preview, join.
- Club detail: header, icon, current book, member list, invite code, invite member section, leave/delete controls, club feed.
- Club feed uses the same post/feed/comment primitives as Home.
- Posts from Home can be cross-posted to a club.
- Posts created in a club automatically attach the club ID.

### Security

- `is_club_member` SECURITY DEFINER function avoids RLS recursion.
- Members can view club details/feed.
- Only members can post to a club.
- Admins/creator handle club update/delete/icon/current-book controls.
- Member invites are allowed for admins and optionally regular members when `members_can_invite` is enabled.

---

## 14. Theming

Reading Nook uses profile themes as decorative identity and app-wide visual tokens.

### Current theme set

Current shipped theme keys are 12 themes:

| Theme key | Display direction | Mode |
| --- | --- | --- |
| `matcha` | Green tea / calm tea ceremony | Light |
| `coffee` | Warm morning cafe | Light |
| `galaxy` | Pastel purple cosmic | Light |
| `raindrops` | Light blue rainy day | Light |
| `sakura` | Pink cherry blossoms | Light |
| `vinyl` | Bold red music/records | Light |
| `sunroom` | Yellow sunroom / bright indoor plants | Light |
| `citrus` | Orange citrus/fresh fruit | Light |
| `garden` | Dark garden / moonlit or nighttime garden direction; legacy `plant` normalizes to this | Dark profile theme |
| `cats` | Dark cat theme with warm accents | Dark profile theme |
| `kintsugi` | Dark blue/gold kintsugi porcelain | Dark profile theme |
| `observatory` | Charcoal/brass old observatory with constellation direction | Dark profile theme |

### Behavior

- Themes define nav palette, background gradient, decoration slots, preview data, and UI tokens.
- Dark profile themes use extended `uiTokens` / `darkProfile` behavior and `ProfileThemeApplier` data attributes/variables.
- New accounts still receive a random theme after hydration.
- Themed surfaces include Home, Library, Add, Ratings, Friends/Friend Profile, Clubs, Settings, and Profile decorations.
- Bottom nav tokens follow active theme.

### Icon directions

- Shelf icons: Want to Read = bookmark; Currently Reading = open book; Finished = book with checkmark; Did Not Finish should use a soft non-harsh stop/unfinished-book treatment if iconized.
- Clubs icon direction: cozy reading nook/window motif, aligned with Friends icon style.

### Product note

This is not a generic global dark mode. Darker themes are specific nighttime/cozy moods.

---

## 15. Progress Tracking

Progress applies to Currently Reading books.

### Estimated

Users select one of four broad progress bands. Stored as `estimatedRange: [lo, hi]`. UI uses compact 2×2 tiles.

### Exact

Users can enter Current page and Total pages even when `totalPages` is unknown. Saving updates both catalog total pages and per-user reading progress.

### Feed behavior

Progress updates can create/upsert progress events in the feed, with private-book sanitization for non-owners.

---

## 16. Deployment / Environment

- Vercel root directory should be `app/`.
- Commands from `app/`: `npm run dev`, `npm test`, `npm run lint`, `npm run build`.
- Required env:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `GOOGLE_BOOKS_API_KEY`
- Optional/server-only env:
  - `SUPABASE_SERVICE_ROLE_KEY`
- Without Supabase env, the app will not function as intended because login is mandatory.
- LAN testing: `npm run dev -- --hostname 0.0.0.0 --port 3000`.

---

## 17. Migration History

All migrations live in `supabase/migrations/` and must be run in order.

| Migration | Purpose |
| --- | --- |
| `001_reading_nook.sql` | Core profiles, libraries, friendships |
| `002_profiles_username.sql` | Username support |
| `003_profiles_avatar.sql` | Avatar URL and avatar storage |
| `004_friends_always_share_library.sql` | Legacy accepted-friend library visibility update |
| `005_feed.sql` | Feed events, posts, post reactions |
| `006_posts_update.sql` | Post updates, book author, comment fields |
| `007_comment_replies.sql` | Comment reply support |
| `008_event_reactions.sql` | Likes/comments on events |
| `009_discover_cache.sql` | Google Books discover cache |
| `010_comment_likes.sql` | Likes on comments/replies |
| `011_clubs.sql` | Clubs, members, club posts, initial RLS |
| `012_clubs_fix_recursion.sql` | SECURITY DEFINER club membership fix |
| `013_club_members_can_invite.sql` | Members-can-invite setting |
| `014_in_app_notifications.sql` | Notifications and club feed seen tracking |
| `015_club_invites.sql` | Pending club invites |
| `016_club_icon.sql` | Club icon storage and icon URL |
| `017_follows_and_profile_visibility.sql` | `profiles.is_public`, `follows` table, RLS, friendship-to-follow backfill |
| `018_library_visibility_public_and_followers.sql` | Library RLS: public profiles open to all authenticated users; private profiles open to approved one-way followers |

---

## 18. Legacy / Reference Systems

| Asset | Status |
| --- | --- |
| `git-forked-database/` | Historical Goodbooks data; not live source |
| `recommender/` | Offline experiments/reference |
| `notebook.ipynb` | STAT course artifact/reference |
| Goodbooks static JSON | Not live UI source |
| `app/src/lib/bookProviders/openLibrary.ts` | Deleted |
| `app/src/lib/enrichBook.ts` | Google Books work enrichment via `/api/books/work` |
| `MagicLinkAuthForm.tsx` | Deleted |
| `SyncConflictSheet.tsx` | Deleted |
| `RatedBookDetailSheet.tsx` | Exists but unused/superseded |
| `/recs` | Redirect stub |
| `/leaderboard` | Redirect/replace legacy |

Do not delete legacy/reference files without explicit permission.

---

## 19. Cursor / Agent Rules

When editing Reading Nook:

1. Google Books first for live search/enrichment/discover.
2. Goodbooks/static data/Python/notebook are reference only.
3. No star ratings.
4. Add stays unified; no standalone Recs tab.
5. Supabase is required; Google OAuth only; no local-only product mode.
6. Sync is revision-aware and optimistic; preserve the 500ms debounce and stale-overwrite protections.
7. Current bottom nav is Home | Library | Add | Ratings | Profile.
8. Clubs are shipped but not a bottom tab.
9. Shelf labels exactly: Currently Reading, Finished, Want to Read, Did Not Finish.
10. Finished ranking uses sentiment buckets + pairwise comparison only.
11. Non-finished shelves in Ratings do not show derived/recommendation scores.
12. `BookDetailSheet` is the unified active detail view.
13. Private books must be sanitized server-side.
14. Feed comments support only one level of replies.
15. Automatic feed events are activity history; do not add delete controls by default.
16. Theme system is profile motif/token-based; do not replace with unrelated global skins.
17. Keep the 12 shipped themes unless explicitly scoped otherwise.
18. Use service-role clients only on server-side trusted paths.
19. Prefer small incremental diffs.
20. Do not edit `.cursor/plans/` unless explicitly asked.
21. Do not commit unless explicitly asked.
22. After substantive code changes, run from `app/`: `npm run lint`, `npm test`, `npm run build`.
23. Markdown-only PRD/doc edits do not require app build commands.

---

## 20. Resolved product decisions

| Topic | Decision |
| --- | --- |
| BookDetailSheet layout | Keep compact horizontal header (matches AddToShelf); description with More/Less |
| Theme display name | **Garden** (`garden` key; legacy `plant` normalizes to `garden`) |
| Book enrichment module | `app/src/lib/enrichBook.ts` |
| Ratings genre/author filters | URL/deep-link only from Profile; no in-page pickers on `/ratings` |
| Library visibility | Instagram-style: public = open library; private = approved one-way follower; friends = mutual follow label only |
| Private request accept | One-way follow (requester → owner), not mutual |
| New account default | Private profile (`is_public = false`) |
| Custom shelves/collections | Possible future roadmap; not shipped |

---

**Document maintenance:** This file is the canonical current PRD. [`Reading_Nook_Product_PRD.md`](Reading_Nook_Product_PRD.md) points here.
