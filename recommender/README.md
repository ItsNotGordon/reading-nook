# Recommender Pipeline (Scaffold)

This folder begins the offline recommendation pipeline for Reading Nook.

Goal: generate `app/public/data/recommendations.json` from the original STAT 280 data sources, without running ML in the browser.

## Pool size vs. in-app display

By default, `generate_recommendations.py` writes a **large ranked pool** (see `DEFAULT_RECS_POOL_SIZE` in the script). The Reading Nook app shows **up to 30 books at a time** that are not already on your shelves, in rank order, so adding books surfaces the next candidates from the pool without refetching a new file.

Re-run from the **`app`** directory: `npm run build:recs`. To change how many rows are written, set environment variable **`READING_NOOK_RECS_POOL`** (integer) before running Python, or edit **`DEFAULT_RECS_POOL_SIZE`** in `generate_recommendations.py`.

## Files

- `generate_recommendations.py`
  - Loads:
    - `git-forked-database/books.csv`
    - `git-forked-database/ratings.csv`
    - `git-forked-database/book_tags.csv`
    - `git-forked-database/tags.csv`
    - optional `app/public/data/user-preferences.json`
  - Writes:
    - `app/public/data/recommendations.json`

## Current status

This first implementation is a scaffold:

1. Loads CSVs.
2. Builds book-to-genre lookups from `book_tags + tags + books`.
3. Optionally loads app catalog (`app/public/data/books.json`) to align title/author/cover fields.
4. Produces valid recommendation objects in this shape:

```json
[
  {
    "bookId": "string",
    "title": "string",
    "author": "string",
    "coverUrl": "string",
    "genres": ["string"],
    "rawScore": 4.2,
    "rawKind": "goodreads_average_rating_1_5",
    "score": 8.0,
    "reason": "string",
    "source": "Apriori + KNN"
  }
]
```

### Score fields (dual-field contract)

- **`rawScore`**: numeric `average_rating` from Goodbooks `books.csv` (typically **1–5**). This is the preserved “truth” for the current placeholder pipeline.
- **`rawKind`**: short constant describing what `rawScore` means. Current value: **`goodreads_average_rating_1_5`**. Future pipelines (e.g. KNN probability) can use different `rawKind` values without ambiguity.
- **`score`**: **display** value on **0–10**, derived from `rawScore` with a fixed linear map (not batch-relative):
  - If `rawScore` is missing, non-positive, or NaN → **`score` = 0.0**.
  - Otherwise: clamp `rawScore` to **[1, 5]**, then **`(x - 1) / 4 * 10`**, rounded to **1 decimal**.

It currently uses this Goodreads-average baseline as placeholder scoring and includes TODOs where Apriori + KNN extraction will plug in.

## Notebook extraction notes

From `notebook.ipynb`, the core hybrid flow appears to be:

1. **Data loading**
   - Reads Goodbooks data from `git-forked-database`.
   - Merges ratings with books into `main_df`.

2. **Tag/genre prep**
   - Creates `book_tags_named` by merging:
     - `book_tags_df` + `tags_df` on `tag_id`
     - then maps into app `book_id` via `books_df[['book_id', 'goodreads_book_id']]`.
   - Builds `genre_tags` with lowercase/normalized tags and a restricted genre vocabulary.

3. **Apriori logic**
   - Builds user-genre baskets from liked books (`rating >= 4`).
   - Runs:
     - `frequent_itemsets = apriori(genre_data, min_support=0.1, use_colnames=True)`
     - `rules = association_rules(..., metric="confidence", min_threshold=0.5)`
   - Filters rules by support/confidence/lift and antecedent/consequent sizes.
   - `recommend_genres_from_apriori(user_id, ...)` returns recommended genres based on matching rule antecedents.

4. **KNN feature prep**
   - Builds `book_genres` one-hot genre matrix.
   - Builds `knn_df` with:
     - `average_rating`
     - `ratings_count`
     - one-hot genre features
     - target `liked` (binary)
   - Feature list includes rating/popularity + one-hot genres.

5. **KNN model training**
   - Uses sklearn `Pipeline(StandardScaler, KNeighborsClassifier)`.
   - Notebook experiments with different `n_neighbors` (e.g., 4 and 23).

6. **Hybrid recommender function**
   - `hybrid_apriori_knn_recommend(user_id, ...)`:
     - get Apriori genres
     - filter candidate books to matching genres
     - remove already-rated books
     - run KNN prediction/probabilities on remaining candidates
     - merge with `book_info`
     - sort and return recommendations

### ID assumptions to preserve

- The notebook relies on mapping tags to app book ids through:
  - `goodreads_book_id` -> `book_id` (from `books.csv`).
- Any extraction should keep this mapping explicit to avoid mismatches between:
  - `book_tags.csv` IDs
  - app catalog IDs
  - ratings/train matrix IDs

## Migration TODOs

- Extract Apriori prep + rule generation into pure functions.
- Extract KNN feature matrix builder and model trainer into script modules.
- Recreate hybrid recommendation function in script form (not notebook state).
- Add optional personalization input shape in `user-preferences.json`.
- Add reproducible params (support/lift/k) and deterministic output ordering.

## Run

From repo root:

```bash
python recommender/generate_recommendations.py
```

Or from `app/`:

```bash
npm run build:recs
```

