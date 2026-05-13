# PRD: The Reading Nook MVP

## 1. Product Overview

**Product Name:** The Reading Nook  
**Product Type:** Mobile-first web app  
**Target Platform:** Next.js web app, optimized for iPhone/mobile browser  
**MVP Storage:** localStorage  
**Primary User:** Single user  
**Project Goal:** Convert the existing STAT 280 book recommendation project into a usable reading tracker app with a Beli-style ranking system.

The Reading Nook is a mobile-first reading tracker that combines Goodreads-style book organization with Beli-inspired pairwise ranking. Instead of asking users to manually assign arbitrary star ratings, the app asks users to place finished books into broad sentiment buckets and then rank books through direct comparisons.

The app should eventually support recommendation logic powered by user rankings and the existing STAT 280 Apriori + KNN notebook, but the MVP should focus first on product architecture, reading tracking, and ranking.

---

## 2. Core Product Philosophy

The app should not ask:

> “What rating would you give this book?”

Instead, it should ask:

> “How did you feel about this book?”  
> “Did you like this book more than that book?”

The app derives scores from user preference rankings rather than manual rating input.

This makes the system feel:

- less arbitrary
- more personal
- easier to use
- better suited for recommendation signals

---

## 3. MVP Scope

### In Scope

The MVP includes:

1. Mobile-first app shell
2. Five tabs:
  - Library
  - Leaderboard
  - Add
  - Recs
  - Profile
3. Book library management
4. Three shelves:
  - Currently Reading
  - Finished
  - Want to Read
5. Add book flow using sample/local book data
6. Progress tracking
  - Exact page mode
  - Estimated range mode
7. Finished book sentiment bucket selection
8. Pairwise ranking within sentiment buckets
9. Derived score calculation
10. Basic recommendations placeholder or simple content-based recommendations
11. localStorage persistence

### Out of Scope for MVP

Do not build yet:

- user accounts
- authentication
- social features
- public profiles
- friends/following
- cloud database
- real-time sync
- advanced ML recommendation pipeline
- full API integration
- review writing
- comments
- likes
- notifications
- multiple users

The existing STAT 280 Apriori + KNN notebook should be preserved for later recommendation work, but it should not drive the initial MVP architecture. You should also never change the content of notebook.ipynb. If you ever need to use it, create a new copy and refer to the copy in the future.

---

## 4. Target User

The initial user is one person who wants to:

- keep track of books they are reading
- remember books they want to read
- rank finished books in a way that feels natural
- avoid arbitrary star ratings
- get recommendations based on their actual taste

This is a single-user MVP, so the product should prioritize speed, clarity, and personal usefulness over social engagement.

---

## 5. Navigation Structure

The app has a fixed bottom navigation with five tabs:

```txt
Library | Leaderboard | Add | Recs | Profile
```

Each tab should be optimized for mobile use.

### Tab Purposes


| Tab         | Purpose                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| Library     | View books by shelf                                                                                    |
| Leaderboard | View your friends/people you follow and their rankings                                                 |
| Add         | Add/move book(s) into your library. If you are adding/moving into finished, prompt the user for rating |
| Recs        | View recommendations                                                                                   |
| Profile     | View reading stats and taste summary                                                                   |


---

## 6. Data Model

The app should separate static book metadata from user-specific book data.

### Book

Represents general book information.

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
};
```

### Shelf

```ts
type Shelf = "currentlyReading" | "finished" | "wantToRead";
```

### Progress Mode

```ts
type ProgressMode = "exact" | "estimated";
```

### Sentiment Bucket

```ts
type SentimentBucket = "liked" | "okay" | "disliked";
```

### UserBook

Represents the user’s relationship to a book.

```ts
type UserBook = {
  bookId: string;
  shelf: Shelf;

  progressMode?: ProgressMode;
  currentPage?: number;
  estimatedRange?: [number, number];

  sentimentBucket?: SentimentBucket;
  derivedScore?: number;

  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Bucket Rankings

Each sentiment bucket stores book IDs in ranked order.

```ts
type BucketRankings = {
  liked: string[];
  okay: string[];
  disliked: string[];
};
```

### App State

```ts
type AppState = {
  books: Record<string, Book>;
  userBooks: Record<string, UserBook>;
  rankings: BucketRankings;
};
```

---

## 7. Library Tab Requirements

The Library tab is the home base of the app.

### Sections

The Library tab must show three vertically stacked sections:

1. Currently Reading
2. Finished
3. Want to Read

Each section should be horizontally scrollable.

### Book Card Requirements

Each book card should show:

- cover image or placeholder
- title
- author
- shelf-specific metadata

### Currently Reading Cards

Show:

- progress bar
- progress percentage or estimated range
- visual distinction between exact and estimated progress

Exact progress:

```txt
green progress bar
```

Estimated progress:

```txt
yellow progress bar or range indicator
```

### Finished Cards

Show:

- derived score badge, for example `8.7`
- sentiment bucket label, for example `Liked`

### Want to Read Cards

Show:

- cover
- title
- author

No progress or score required.

### Empty States

Each shelf should show a friendly empty state when no books exist.

Examples:

```txt
No books here yet.
Start adding books to your library.
```

---

## 8. Add Tab Requirements

The Add tab allows the user to add a book to their library.

### MVP Source

For the MVP, books may come from local sample data.

API integration can come later.

### Add Flow

1. User searches for a book
2. App shows matching results
3. User taps a book
4. App opens shelf selection
5. User chooses:
  - Want to Read
  - Currently Reading
  - Finished

### If User Chooses Want to Read

The book is added to the `wantToRead` shelf.

### If User Chooses Currently Reading

The book is added to the `currentlyReading` shelf.

The user may optionally set progress.

### If User Chooses Finished

The book is added to the `finished` shelf.

The app should then start the sentiment bucket flow.

---

## 9. Progress Tracking Requirements

The app supports two progress modes:

1. Exact mode
2. Estimated mode

### Exact Mode

Used when the user knows their current page.

Inputs:

```txt
currentPage
```

The app uses:

```txt
totalPages
```

from the book metadata.

Formula:

```ts
progress = currentPage / totalPages;
```

Clamp the result between 0 and 1.

Example:

```txt
currentPage = 125
totalPages = 400
progress = 31%
```

### Exact Mode Notes

Because page counts vary by edition, the app should treat exact progress as approximate.

Possible UI copy:

```txt
Progress may vary by edition.
```

### Estimated Mode

Used when the user does not know their exact page.

The app asks simple binary questions:

```txt
Have you read around 50%?
```

If yes:

```txt
Have you read around 75%?
```

If no:

```txt
Have you read around 25%?
```

### Estimated Ranges

Map answers to one of four ranges:


| Range   | Meaning     |
| ------- | ----------- |
| 0–25%   | early       |
| 25–50%  | started     |
| 50–75%  | halfway     |
| 75–100% | almost done |


Store as:

```ts
estimatedRange: [number, number]
```

Examples:

```ts
[0, 0.25]
[0.25, 0.5]
[0.5, 0.75]
[0.75, 1]
```

### Progress Display

Exact mode:

```txt
31%
```

Estimated mode:

```txt
~50–75%
```

or

```txt
Around halfway
```

---

## 10. Finish Book Flow

When a user marks a book as finished:

1. Move book to `finished` shelf
2. Set `finishedAt`
3. Ask for sentiment bucket
4. Insert book into ranked list for that bucket
5. Recompute derived scores for all books in that bucket

---

## 11. Sentiment Bucket Requirements

When a book is finished, the user must choose one of three buckets:


| Bucket         | Score Range |
| -------------- | ----------- |
| Liked it       | 7.0–10.0    |
| It was okay    | 3.6–6.9     |
| Didn’t like it | 1.0–3.5     |


The bucket determines the score range.

The user does not manually assign the score.

---

## 12. Pairwise Ranking Requirements

Within each sentiment bucket, books are ranked through pairwise comparisons.

Example question:

```txt
Did you like Scythe more than Fahrenheit 451?
```

or:

```txt
Which did you like more?
[Scythe] [Fahrenheit 451]
```

### Ranking Behavior

Each bucket is an ordered list.

Top of the list means most liked within that bucket.

The app should insert new books into the bucket using binary-search-style comparison.

### Why Binary Search

This minimizes the number of comparisons.

For example, if a bucket has 16 books, the user should only need around 4 comparisons.

### Insertion Logic

```ts
async function insertBookIntoBucket(
  newBookId: string,
  rankedBookIds: string[],
  askComparison: (existingBookId: string) => Promise<boolean>
) {
  let low = 0;
  let high = rankedBookIds.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const prefersNewBook = await askComparison(rankedBookIds[mid]);

    if (prefersNewBook) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  rankedBookIds.splice(low, 0, newBookId);
  return rankedBookIds;
}
```

---

## 13. Derived Scoring Requirements

Scores are derived from ranking position.

Users should never manually enter a numeric rating.

### First Book in a Bucket

If a bucket has only one book, that book receives the bucket maximum.

Examples:


| Bucket   | First Book Score |
| -------- | ---------------- |
| Liked    | 10.0             |
| Okay     | 6.9              |
| Disliked | 3.5              |


### Score Recalculation

Whenever a book is inserted into a bucket:

- recompute scores for all books in that bucket
- update each corresponding `UserBook.derivedScore`

### Curved Distribution

Scores should not be evenly spaced.

Use a curve so top books feel special and middle values compress.

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

### Bucket Ranges

```ts
const BUCKET_RANGES = {
  liked: { min: 7.0, max: 10.0 },
  okay: { min: 3.6, max: 6.9 },
  disliked: { min: 1.0, max: 3.5 },
};
```

### Example Liked Bucket

For four books:

```txt
10.0
~8.7
~7.8
7.0
```

Higher score always means the user liked the book more.

Scores should never overlap between buckets.

---

## 14. Rank Tab Requirements

The Rank tab has two main states.

### State 1: Pending Ranking

If there is a finished book that needs ranking:

Show a comparison interface.

UI should include:

- current book cover
- comparison book cover
- question: “Which did you like more?”
- two large tappable choices

### State 2: No Pending Ranking

Show ranked lists by bucket:

1. Liked
2. Okay
3. Didn’t Like

Each row should show:

- rank number
- cover thumbnail
- title
- author
- derived score

---

## 15. Dynamic Re-ranking Requirements

The user should be able to change their mind.

The app should support:

- moving a book from one sentiment bucket to another
- removing a book from one bucket ranking
- inserting it into a different bucket
- recomputing scores for both affected buckets

This does not need to be polished in the earliest MVP, but the data model should support it.

---

## 16. Recs Tab Requirements

### MVP Version

For the earliest MVP, the Recs tab may use placeholder recommendations or simple content-based matching.

The app should not depend on the STAT 280 notebook yet.

### Later Version

The Recs tab will eventually use the existing STAT 280 Apriori + KNN recommendation work.

Possible later pipeline:

```txt
ranked user books
+ sentiment buckets
+ derived scores
+ genre metadata
+ book metadata
↓
Python recommender
↓
recommendations.json
↓
Next.js frontend
↓
Recs tab
```

### Recommendation Inputs Later

The recommendation system should eventually use:

- ranked books
- sentiment bucket
- derived score
- genre metadata
- author metadata
- book popularity
- dataset features

### Positive Signals

Positive signals include:

- books in liked bucket
- top-ranked books
- genres associated with high scores
- authors associated with high scores

### Negative Signals

Negative signals include:

- books in disliked bucket
- low-ranked books
- genres associated with low scores

### Recs UI

Each recommendation card should show:

- cover
- title
- author
- reason text

Example reasons:

```txt
Because you liked dystopian sci-fi.
```

```txt
Matches books you ranked highly.
```

```txt
Similar themes, lighter pacing.
```

---

## 17. Profile Tab Requirements

The Profile tab should show simple reading stats.

### MVP Stats

Show:

- total books
- currently reading count
- finished count
- want to read count
- average derived score
- top genres

### Top Genres

Top genres should be inferred from finished or liked books.

MVP version can be simple frequency counting.

Example:

```txt
Your Top Genres
Dystopian
Romance
Science Fiction
Contemporary
```

---

## 18. Persistence Requirements

The MVP should use localStorage.

### Storage Key

```ts
const STORAGE_KEY = "reading-nook-v1";
```

### Requirements

The app should:

- load saved state on app start
- save state after changes
- handle missing localStorage gracefully
- handle corrupted localStorage gracefully
- fall back to initial state when needed

---

## 19. Design Requirements

### Style

The app should feel:

- cozy
- calm
- clean
- mobile-first
- book-focused
- premium but simple

### Visual Direction

Use:

- warm neutral backgrounds
- soft green primary accents
- yellow for estimated progress
- rounded cards
- subtle borders
- soft shadows
- generous spacing

### Avoid

Do not use:

- star ratings
- cluttered Goodreads-style layouts
- dense data tables
- overly bright colors
- social-media-heavy UI

---

## 20. Recommended Component Structure

```txt
src/
  app/
    page.tsx
    library/
      page.tsx
    add/
      page.tsx
    rank/
      page.tsx
    recs/
      page.tsx
    profile/
      page.tsx

  components/
    BottomNav.tsx
    PageShell.tsx
    BookCard.tsx
    ShelfSection.tsx
    ProgressBar.tsx
    ScoreBadge.tsx
    SentimentPicker.tsx
    ComparisonCard.tsx
    BookSearchResult.tsx

  lib/
    types.ts
    storage.ts
    sampleData.ts
    ranking.ts
    progress.ts
    recommendations.ts
    store.ts
```

---

## 21. Recommended Build Order

Build in this order:

### Phase 1: Foundation

1. App shell
2. Bottom navigation
3. Core types
4. localStorage store
5. Sample data

### Phase 2: Library

1. Library tab
2. Shelf sections
3. Book cards
4. Empty states

### Phase 3: Add Flow

1. Add tab search
2. Add book to shelf
3. Move book between shelves

### Phase 4: Progress

1. Exact progress mode
2. Estimated progress mode
3. Progress display

### Phase 5: Finish + Rank

1. Mark book finished
2. Sentiment bucket picker
3. Pairwise comparison flow
4. Bucket insertion
5. Derived score recalculation

### Phase 6: Recs + Profile

1. Basic recommendations
2. Recommendation reasons
3. Profile stats
4. Top genres

### Phase 7: ML Integration Later

1. Revisit STAT 280 notebook
2. Convert recommender logic into Python pipeline
3. Export recommendations as JSON
4. Display JSON recommendations in Recs tab

---

## 22. Cursor Prompt: Build From This PRD

You can paste this into Cursor:

```txt
Use this PRD as the source of truth for The Reading Nook MVP.

We are converting an existing STAT 280 book recommendation repo into a mobile-first Next.js reading tracker web app.

Important:
- Do not modify notebook.ipynb right now.
- Do not integrate the Apriori + KNN recommender yet.
- Focus on the MVP app architecture first.
- Use TypeScript, Tailwind CSS, and localStorage.
- The app is single-user only.
- The core product idea is Goodreads-style tracking plus Beli-style pairwise ranking instead of star ratings.

Build incrementally in this order:
1. Core types
2. localStorage app state
3. Library tab
4. Add flow
5. Progress tracking
6. Finish book flow
7. Sentiment buckets
8. Pairwise ranking
9. Derived scores
10. Basic recommendations/profile

Follow the PRD closely and avoid overbuilding.
```

---

## 23. Success Criteria

The MVP is successful when the user can:

1. Open the app on mobile
2. View their Library
3. Add a book
4. Put it on a shelf
5. Track reading progress
6. Mark a book as finished
7. Choose a sentiment bucket
8. Rank it against previous books
9. See a derived score
10. View simple recommendations or recommendation placeholders
11. Refresh the page without losing data

The MVP should feel like a real product even before the advanced recommender is integrated.