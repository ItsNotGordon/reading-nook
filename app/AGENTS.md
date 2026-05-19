<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# The Reading Nook (product)

## Source of truth

- **`../docs/PRD.md`** → **`../docs/Reading_Nook_Product_PRD.md`** (canonical: as-built app + friends-scale roadmap)
- Supplementary: `Reading_Nook_PRD.md`, `Reading_Nook_Updated_PRD.md` (algorithms/history; nav/types may be outdated)
- Before changing tabs, shelves, persistence, ranking, or recs scope, read the Product PRD first.

The Cursor rule **Reading Nook — consult PRD** applies when working under `app/`.

## Product direction (post-STAT)

Reading Nook is a **small friends-scale product** (deploy for you + friends), not a class project or a viral social app.

| Priority | Focus |
| -------- | ----- |
| **Core** | Shelves, progress, finish flow, sentiment buckets, pairwise ranking, derived scores |
| **Recs** | Ranking-driven personalization today; per-user server recs when infra exists |
| **Infra (phased)** | Deploy → Supabase/auth → sync → friend libraries / taste comparison → book API + scalable recs |
| **Reference only** | `notebook.ipynb`, `recommender/`—preserve; not the default roadmap |

Do **not** edit `notebook.ipynb` in place. Copy it if you need experiments.

## How to work in `app/`

1. **Match existing patterns** in `src/lib`, components, and scripts before adding new abstractions.
2. **MVP today:** `localStorage` and static files under `public/data/` are valid; don’t rip them out unless the task is explicitly an infra migration.
3. **New features:** Prefer designs that later map to **authenticated APIs and Postgres** (typed IDs, clear ownership of user vs catalog data, no new hard dependencies on checked-in global `recommendations.json` as the only rec source).
4. **Recs changes:** Improve personalization from **rankings and genres** in app state; avoid wiring the STAT 280 notebook into the Next.js bundle.
5. **Social / auth / cloud:** Listed in the PRD roadmap—implement only when the user asks; design so they don’t fight the ranking model.

## Out of scope unless asked

- Star ratings (product uses buckets + pairwise rank only)
- In-place edits to `notebook.ipynb`
- Apriori + KNN integration as the default next step for recommendations
