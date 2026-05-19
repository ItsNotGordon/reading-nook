<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# The Reading Nook (product)

## Source of truth

**[`../docs/Reading_Nook_Product_PRD.md`](../docs/Reading_Nook_Product_PRD.md)** is the **only** source of truth for **current product decisions**:

| Use Product PRD for | Examples |
| ------------------- | -------- |
| **UI / UX** | Tab labels, layouts, empty states, Add = search + recs on one page |
| **Routes** | `/library`, `/ratings`, `/add`, `/friends`, `/profile`; redirects from `/recs`, `/leaderboard` |
| **Data model** | `catalog`, `userBooks`, `bucketRankings`, shelves (`want_to_read` \| `reading` \| `finished`), `UserProfile` |
| **Roadmap** | Friends-scale deploy → auth/Supabase → sync → friend features → catalog API + per-user recs |

Entry point: [`../docs/PRD.md`](../docs/PRD.md) links here.

**Historical / reference only (do not override Product PRD):**

| Document | Purpose |
| -------- | ------- |
| [`Reading_Nook_PRD.md`](../docs/Reading_Nook_PRD.md) | Original MVP spec; extra detail on progress, pairwise insertion, scoring curves |
| [`Reading_Nook_Updated_PRD.md`](../docs/Reading_Nook_Updated_PRD.md) | Mid-transition snapshot; partially outdated |

If an older PRD disagrees with **Reading_Nook_Product_PRD.md** on navigation, types, routes, or shipped behavior, **follow the Product PRD**.

**Preserved repo assets (not deleted; not the product roadmap):** root `notebook.ipynb`, `recommender/`, `git-forked-database/`. Do not edit `notebook.ipynb` in place—copy to experiment.

The Cursor rule **Reading Nook — consult PRD** applies when working under `app/`.

## Product direction

Reading Nook is a **small friends-scale product** (deploy for you + friends), not a class project or a viral social app.

| Priority | Focus |
| -------- | ----- |
| **Core** | Shelves, progress, finish flow, sentiment buckets, pairwise ranking, derived scores |
| **Recs** | Ranking-driven personalization today; per-user server recs when infra exists |
| **Infra (phased)** | Deploy → Supabase/auth → sync → friend libraries / taste comparison → book API + scalable recs |
| **Reference only** | `notebook.ipynb`, `recommender/`—preserve; not the default roadmap |

## How to work in `app/`

1. **Read Product PRD first** before changing tabs, shelves, persistence, ranking, or recs scope.
2. **Match existing patterns** in `src/lib`, components, and scripts before adding new abstractions.
3. **MVP today:** `localStorage` and static files under `public/data/` are valid; don’t rip them out unless the task is explicitly an infra migration.
4. **New features:** Prefer designs that later map to **authenticated APIs and Postgres** (typed IDs, clear ownership of user vs catalog data).
5. **Recs changes:** Improve personalization from **rankings and genres** in app state; avoid wiring the STAT 280 notebook into the Next.js bundle.
6. **Social / auth / cloud:** Implement only when the user asks or when scoped to a Product PRD roadmap phase.

## Out of scope unless asked

- Star ratings (product uses buckets + pairwise rank only)
- In-place edits to `notebook.ipynb`
- Apriori + KNN integration as the default next step for recommendations
- Treating older PRDs as authoritative for current UI, routes, or data model
