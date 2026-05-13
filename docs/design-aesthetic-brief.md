# Reading Nook — aesthetic alignment brief

Use this with ChatGPT or designers alongside **`DESIGN.md`** (Stitch export: cozy reads companion) and the five reference screens.

## Sources merged here

1. **`DESIGN.md`** — YAML tokens + markdown system: “digital sanctuary,” sage primary `#426447`, warm paper background `#fbf9f9`, honey/yellow secondary `#efe0a7` / `#f2e2aa`, Inter-forward typography spec, 8px grid, 16–20px radii, soft shadows, thick progress bars, pairwise ranking as hero pattern.
2. **Reference UI mocks** (Rank, Profile, Add shelf sheet, Personal Library, Recs): forest-green accents, cream/off-white chrome, **serif for app title and major headings** + sans for UI chrome, pill-shaped primary controls, sage active nav state, generous whitespace, genre chips, optional score badges on finished titles.

## Intentional deviation from DESIGN.md alone

- **Typography:** The Stitch markdown specifies Inter for all roles; the **reference screens use a serif for “The Reading Nook” and hero headings**. The app keeps **Literata (serif) + DM Sans (sans)** so branding matches the mocks; body/UI stays sans for readability.
- **Navigation label:** Mocks show **“Rank”**; the shipped route may still be **`/leaderboard`** — naming can be aligned later without changing IA.

## Implementation snapshot (codebase)

- Global tokens live in **`app/src/app/globals.css`** (`@theme` maps semantic colors for Tailwind).
- Bottom nav uses **backdrop blur**, **sage active treatment** (icon chip + label emphasis) toward the mock style.
- **Progress** tracks use sage fill + neutral track per “thick tracker” guidance.

## Design pillars (single paragraph)

Warm neutral surfaces (not pure white), **sage green** for primary actions and reading progress, **muted honey** for highlights and “delight,” soft rounded geometry, minimal borders with **ambient shadow** depth, content-first layout so **covers and progress** stay focal — consistent with pairwise ranking over star grids.
