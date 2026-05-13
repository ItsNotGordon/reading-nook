#!/usr/bin/env python3
"""
Offline recommendations JSON generator scaffold for Reading Nook.

Current stage:
- Loads Goodbooks CSV sources.
- Builds a simple placeholder recommendation list.
- Writes app/public/data/recommendations.json.

Future stage:
- Extract Apriori + KNN logic from notebook.ipynb into reusable modules.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = REPO_ROOT / "git-forked-database"
APP_PUBLIC_DATA_DIR = REPO_ROOT / "app" / "public" / "data"
OUTPUT_PATH = APP_PUBLIC_DATA_DIR / "recommendations.json"
CATALOG_PATH = APP_PUBLIC_DATA_DIR / "books.json"
USER_PREFS_PATH = APP_PUBLIC_DATA_DIR / "user-preferences.json"


def _safe_str(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    return str(value)


def _safe_number(value: Any, default: float = 0.0) -> float:
    try:
        as_float = float(value)
        if pd.isna(as_float):
            return default
        return as_float
    except Exception:
        return default


RAW_KIND_GOODREADS_AVG = "goodreads_average_rating_1_5"


def display_score_10_from_goodreads_avg(average_rating: Any) -> float:
    """
    Map Goodreads-style average (typically 1–5) to a 0–10 display score:
    clamp to [1, 5], then (x - 1) / 4 * 10, rounded to 1 decimal.
    Missing, non-positive, or NaN raw maps to 0.0 display.
    """
    try:
        x = float(average_rating)
    except (TypeError, ValueError):
        return 0.0
    if x <= 0 or pd.isna(x):
        return 0.0
    clamped = max(1.0, min(5.0, x))
    return round((clamped - 1.0) / 4.0 * 10.0, 1)


def load_required_csvs() -> dict[str, pd.DataFrame]:
    required = {
        "books": DATA_DIR / "books.csv",
        "ratings": DATA_DIR / "ratings.csv",
        "book_tags": DATA_DIR / "book_tags.csv",
        "tags": DATA_DIR / "tags.csv",
    }
    missing = [str(path) for path in required.values() if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "Missing required recommender input files:\n- " + "\n- ".join(missing)
        )
    return {name: pd.read_csv(path) for name, path in required.items()}


def build_genre_lookup(
    books_df: pd.DataFrame, book_tags_df: pd.DataFrame, tags_df: pd.DataFrame
) -> dict[str, list[str]]:
    tag_map = book_tags_df.merge(tags_df, on="tag_id", how="left")
    tag_map = tag_map.merge(
        books_df[["book_id", "goodreads_book_id"]],
        on="goodreads_book_id",
        how="left",
    )

    # Keep strongest tags first for this scaffold (same intent as notebook tag-count filtering).
    if "count" in tag_map.columns:
        tag_map = tag_map.sort_values("count", ascending=False)

    grouped: dict[str, list[str]] = {}
    for _, row in tag_map.iterrows():
        book_id = _safe_str(row.get("book_id"))
        tag_name = _safe_str(row.get("tag_name")).strip().lower()
        if not book_id or not tag_name:
            continue
        grouped.setdefault(book_id, [])
        if tag_name not in grouped[book_id]:
            grouped[book_id].append(tag_name)

    # Keep JSON concise for now.
    return {book_id: tags[:6] for book_id, tags in grouped.items()}


def load_catalog_by_id() -> dict[str, dict[str, Any]]:
    if not CATALOG_PATH.exists():
        return {}
    raw = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        return {}
    out: dict[str, dict[str, Any]] = {}
    for row in raw:
        if not isinstance(row, dict):
            continue
        book_id = _safe_str(row.get("id"))
        if not book_id:
            continue
        out[book_id] = row
    return out


def load_optional_user_preferences() -> dict[str, Any]:
    if not USER_PREFS_PATH.exists():
        return {}
    try:
        raw = json.loads(USER_PREFS_PATH.read_text(encoding="utf-8"))
        return raw if isinstance(raw, dict) else {}
    except Exception:
        return {}


def build_placeholder_recommendations(
    books_df: pd.DataFrame,
    ratings_df: pd.DataFrame,
    genre_lookup: dict[str, list[str]],
    catalog_lookup: dict[str, dict[str, Any]],
    user_prefs: dict[str, Any],
    limit: int = 30,
) -> list[dict[str, Any]]:
    # TODO: Replace with notebook-extracted hybrid Apriori + KNN pipeline.
    # For scaffold: rank by ratings_count and average_rating.
    ranked = books_df.copy()
    if "ratings_count" in ranked.columns:
        ranked["ratings_count"] = pd.to_numeric(ranked["ratings_count"], errors="coerce").fillna(0)
    else:
        ratings_per_book = ratings_df.groupby("book_id").size().rename("ratings_count")
        ranked = ranked.merge(ratings_per_book, on="book_id", how="left")
        ranked["ratings_count"] = ranked["ratings_count"].fillna(0)

    if "average_rating" in ranked.columns:
        ranked["average_rating"] = pd.to_numeric(ranked["average_rating"], errors="coerce").fillna(0)
    else:
        ranked["average_rating"] = 0.0

    ranked = ranked.sort_values(["ratings_count", "average_rating"], ascending=False)

    excluded_ids = set()
    # Optional hook for future personalized pipeline.
    for key in ("excludeBookIds", "alreadyReadBookIds"):
        values = user_prefs.get(key)
        if isinstance(values, list):
            excluded_ids.update(_safe_str(v) for v in values)

    recommendations: list[dict[str, Any]] = []
    for _, row in ranked.iterrows():
        book_id = _safe_str(row.get("book_id"))
        if not book_id or book_id in excluded_ids:
            continue

        catalog_row = catalog_lookup.get(book_id, {})
        title = _safe_str(catalog_row.get("title")) or _safe_str(row.get("title")) or "Unknown title"
        author = _safe_str(catalog_row.get("author")) or _safe_str(row.get("authors")) or "Unknown author"
        cover_url = _safe_str(catalog_row.get("coverUrl")) or _safe_str(row.get("image_url"))
        genres = catalog_row.get("genres")
        if not isinstance(genres, list) or not genres:
            genres = genre_lookup.get(book_id, [])
        genres = [g for g in (_safe_str(g).strip() for g in genres) if g]

        raw_score = round(_safe_number(row.get("average_rating")), 4)
        display_score = display_score_10_from_goodreads_avg(raw_score)

        recommendations.append(
            {
                "bookId": book_id,
                "title": title,
                "author": author,
                "coverUrl": cover_url,
                "genres": genres,
                "rawScore": raw_score,
                "rawKind": RAW_KIND_GOODREADS_AVG,
                "score": display_score,
                "reason": "Popular baseline recommendation while Apriori + KNN migration is in progress.",
                "source": "Apriori + KNN",
            }
        )
        if len(recommendations) >= limit:
            break

    recommendations.sort(key=lambda r: (-float(r["score"]), str(r["bookId"])))
    return recommendations


def main() -> None:
    frames = load_required_csvs()
    APP_PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)
    catalog_lookup = load_catalog_by_id()
    user_prefs = load_optional_user_preferences()
    genre_lookup = build_genre_lookup(frames["books"], frames["book_tags"], frames["tags"])
    recs = build_placeholder_recommendations(
        books_df=frames["books"],
        ratings_df=frames["ratings"],
        genre_lookup=genre_lookup,
        catalog_lookup=catalog_lookup,
        user_prefs=user_prefs,
    )
    OUTPUT_PATH.write_text(json.dumps(recs, indent=2), encoding="utf-8")
    print(f"Wrote {len(recs)} recommendations to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

