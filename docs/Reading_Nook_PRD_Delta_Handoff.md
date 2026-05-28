# Reading Nook PRD Delta Handoff

## Purpose
This file is a delta/handoff document for future PRD consolidation.  
It summarizes product/design/code changes made or proposed since the canonical PRD, and does not replace the current PRD.

## Baseline
Baseline document: `docs/Reading_Nook_Product_PRD_Current.md`

## Summary of Changes
- Add-to-shelf/unadded-book preview UI redesigned into a shared cozy sheet pattern.
- Per-user private/public book visibility introduced with server-side sanitization on friend/feed surfaces.
- Product decision: no individual delete for automatic shelf/feed events (manual posts remain editable/deletable).
- Liked-by preview direction refined (Option B format + clickable usernames).
- Manual post actions should move to 3-dot menu pattern.
- Score badge redesign is still in exploration/bookmarked state.
- Clubs/Home icon and shelf icon style directions clarified.
- Book detail and comment presentation directions refined.
- Auth/navigation direction reaffirmed (Supabase required, `Clubs` in bottom nav, `Ratings` route-only).

## Detailed Delta

### A) Add-to-shelf / book preview sheet redesign
**Status:** Implemented (with ongoing polish)

**Current PRD says:**  
- Add/shelf flows exist and use modal/sheet patterns.

**Delta / new decision:**  
- Shared add-to-shelf UI should match latest reference:
  1. Header: `Add to shelf` + close X  
  2. Book preview: cover + title/author + truncated description + `More`  
  3. `Choose a shelf` section  
  4. 3 square shelf cards with icon mapping:  
     - Want to Read = bookmark  
     - Currently Reading = open book  
     - Finished = book + checkmark  
  5. Private book row with real switch toggle (not checkbox)  
  6. Genres compact preview (max 3 + `+N`) + `Edit genres` row/chevron  
- Full genre picker hidden by default, shown only after intent.
- Remove redundant large Add/Cancel footer buttons when shelf card taps perform add.
- Applies to `/add` and Home feed preview/add-to-shelf surfaces where shared.

**Implementation notes:**  
- `app/src/components/AddToShelfSheet.tsx`  
- `app/src/components/ShelfPickerSheet.tsx`  
- `app/src/components/AddBookScreen.tsx`  
- `app/src/components/FeedBookPreviewSheet.tsx`

**PRD consolidation notes:**  
- Add a dedicated section for unified add-to-shelf IA, mobile sheet behavior, and compact genre-edit pattern.

### B) Private book feature
**Status:** Implemented (core), additional audit scope bookmarked

**Current PRD says:**  
- Friend/feed/profile data is server-backed; social visibility is access-controlled.

**Delta / new decision:**  
- Add per-user-book visibility (`public | private`) at `UserBook` level (not catalog-level).
- Default visibility = `public`.
- Owner can toggle visibility any time.
- Owner always sees full real metadata.
- Friend-facing private placeholder behavior:
  - title: `Private book`
  - author: `Hidden`
  - generic/private cover placeholder
  - hide genres/notes/description
- Feed and club feed should not leak private title/author/cover/notes/description.
- API responses must sanitize server-side; do not rely on UI-only hiding.
- Private books still count for owner shelves/stats/ratings/recs.

**Implementation notes:**  
- Data/state:
  - `app/src/lib/types.ts`
  - `app/src/lib/app-reducer.ts`
  - `app/src/lib/app-state.tsx`
  - `app/src/lib/storage.ts`
  - `app/src/lib/goodreadsImport.ts`
- Sanitization helper:
  - `app/src/lib/bookPrivacy.ts`
- Friend/feed APIs:
  - `app/src/app/api/friends/[friendId]/library/route.ts`
  - `app/src/app/api/friends/[friendId]/profile/route.ts`
  - `app/src/app/api/friends/[friendId]/taste/route.ts`
  - `app/src/app/api/feed/route.ts`
  - `app/src/app/api/clubs/[clubId]/feed/route.ts`
- UI toggles:
  - `app/src/components/BookDetailSheet.tsx`
  - `app/src/components/FinishBookSheet.tsx`
  - add-to-shelf shared sheet and feed preview flows.

**PRD consolidation notes:**  
- Add explicit viewer-aware sanitizer contract (e.g. `sanitizeBookForViewer({ book, userBook, viewerIsOwner })`).
- Add friend-facing leak-prevention checklist across all public/social surfaces.

### C) Automatic feed event deletion decision
**Status:** Design decision/bookmarked

**Current PRD says:**  
- Feed includes automatic updates and manual posts.

**Delta / new decision:**  
- Do **not** add “Remove update” for automatic shelf/feed events for now.
- Product rule:
  - Manual posts: edit/delete allowed.
  - Automatic updates: not individually deleted by default.
  - Sensitive activity should be hidden via private-book visibility.

**Implementation notes:**  
- Ensure controls remain on manual posts only.

**PRD consolidation notes:**  
- Add explicit action matrix by content type.

### D) Home feed liked-by preview polish
**Status:** Planned / partially implemented

**Current PRD says:**  
- Likes/comments are supported in feed.

**Delta / new decision:**  
- Option B liked-by text spec:
  - 0 likes: `♡ Like`
  - 1 like: `♥ Liked by @username`
  - 2 likes: `♥ Liked by @username and 1 other`
  - 3+ likes: `♥ Liked by @username and N others`
- Usernames in liked-by text should be clickable:
  - self -> `/profile`
  - other -> `/friends/[username]`
- Username clicks must not toggle like or trigger unrelated card actions.
- `and N others` should open liked-by sheet (if available).
- Applies to event/post likes in Home and club feeds where shared.
- Likes visibility: viewers of the post/event can see who liked it.

**Implementation notes:**  
- `app/src/app/api/feed/route.ts`
- `app/src/components/FeedCard.tsx`
- club feed counterpart paths if shared.

**PRD consolidation notes:**  
- Add exact copy rules and tap-target behavior matrix.

### E) Post action controls
**Status:** Planned

**Current PRD says:**  
- Manual posts are editable/deletable by owner.

**Delta / new decision:**  
- Replace visible Edit/Delete text with subtle 3-dot menu for own manual posts.
- Menu actions:
  - Edit post
  - Delete post (destructive)
- Not shown for automatic feed events.

**Implementation notes:**  
- `app/src/components/FeedCard.tsx`

**PRD consolidation notes:**  
- Move to “manual post controls” UX section with accessibility guidance.

### F) Ratings score badge redesign ideas
**Status:** Design bookmarked / needs confirmation

**Current PRD says:**  
- Derived score and rank visuals exist.

**Delta / new decision:**  
- Circular derived-score badges feel too Beli-like.
- Book spine badge ideas bookmarked:
  - Variation 3 (outline spine)
  - Variation 5 (minimal edge)
- Open-book badge explored, but current SVG iteration not final:
  - should be more compact
  - clearer two-page geometry, center crease, top arches, bottom spine dip
- Keep rank/order numbers as circles.
- Final derived score badge choice is not confirmed yet.

**Implementation notes:**  
- `app/src/components/OpenBookScoreBadge.tsx`
- `app/src/components/ScoreBadge.tsx`

**PRD consolidation notes:**  
- Add badge exploration appendix and mark final decision pending.

### G) Clubs/Home icon design
**Status:** Design bookmarked

**Current PRD says:**  
- Clubs is a major surface with branded iconography.

**Delta / new decision:**  
- Preferred Clubs icon direction: reading nook “window” icon (Option 4).
- Should match Friends icon style:
  - soft green circular background
  - dark green simple line icon
  - legible at small sizes.

**Implementation notes:**  
- Home quick-access and clubs icon usage points.

**PRD consolidation notes:**  
- Add icon motif guidance and small-size readability constraints.

### H) Shelf icons
**Status:** Implemented direction + broader consistency target

**Current PRD says:**  
- Shelf taxonomy includes Want/Reading/Finished.

**Delta / new decision:**  
- Canonical icon mapping:
  - Want to Read = bookmark
  - Currently Reading = open book
  - Finished = book with checkmark
- Consistent line-icon style across all shelf-icon surfaces.

**Implementation notes:**  
- Add-to-shelf sheet, move shelf sheet, detail actions, feed shelf indicators, and any shelf headers using icons.

**PRD consolidation notes:**  
- Add canonical icon map into design system chapter.

### I) Book detail sheet design status
**Status:** Implemented (core) / ongoing design target polish

**Current PRD says:**  
- Unified BookDetailSheet exists.

**Delta / new decision:**  
- Preferred visual target:
  - centered large cover
  - centered title/author
  - sentiment pill
  - finished/started/added date line
  - genres section with chips + edit
  - note-card styled notes
  - icon action buttons
  - remove-from-library at bottom

**Implementation notes:**  
- `app/src/components/BookDetailSheet.tsx`

**PRD consolidation notes:**  
- Update with current implemented visual IA and style notes.

### J) Home feed comment UI
**Status:** Design target / needs confirmation

**Current PRD says:**  
- Comment threading and replies are supported.

**Delta / new decision:**  
- Preferred style = Option 3 indented threads:
  - slight indent + guide line
  - small avatar
  - inline username/comment
  - timestamp/actions below
  - full-width rounded input
  - compact circular send button

**Implementation notes:**  
- `app/src/components/FeedCard.tsx`

**PRD consolidation notes:**  
- Add visual thread spec and compact composer spec.

### K) Login/local-only correction
**Status:** Implemented direction

**Current PRD says:**  
- Supabase auth required; login mandatory.

**Delta / new decision:**  
- Reaffirm no local-only mode.
- Unauthenticated users redirect to `/login` via middleware/proxy.

**Implementation notes:**  
- Auth middleware/proxy, login flow.

**PRD consolidation notes:**  
- Keep product direction explicit to prevent local-only assumption drift.

### L) Current nav
**Status:** Implemented direction

**Current PRD says:**  
- Product tab architecture is defined.

**Delta / new decision:**  
- Bottom nav:
  - Home | Library | Add | Clubs | Profile
- `/ratings` remains a route but not a bottom-nav tab.
- `/clubs` is a full product tab.

**Implementation notes:**  
- Tab layout/routing definitions.

**PRD consolidation notes:**  
- Keep route-only vs nav-tab distinction explicit.

## Open Questions
- Final score badge design is not confirmed.
- Exact private-book behavior on every surface (anonymized placeholder vs fully hidden) may need final product confirmation.
- Add-to-shelf shelf-card interaction model (instant add vs select-first) should stay aligned with “no redundant footer Add/Cancel” preference.
- Liked-by sheet: confirm availability and expected interaction if not yet fully implemented.

## Do Not Change
- Do not reintroduce Open Library.
- Do not reintroduce star ratings.
- Do not make `/recs` a product tab.
- Do not edit `.cursor/plans` unless explicitly asked.
- Do not commit unless explicitly asked.

