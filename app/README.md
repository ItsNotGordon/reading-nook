# Reading Nook (Next.js app)

A cozy, mobile-first reading tracker: shelve books, track progress, finish with sentiment, rank in buckets, and get personalized recommendations from your taste + Open Library.

Run all commands from this **`app`** directory.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Live book search & recommendations

- **Add** tab searches [Open Library](https://openlibrary.org/) via `/api/books/search` (no API key).
- Recommendations use your **local library + rankings** (hybrid Apriori/KNN + popularity), not the legacy Goodbooks JSON pool.

### Legacy offline tooling (optional)

```bash
npm run build:books   # public/data/books.json from Goodbooks CSVs
npm run build:recs    # public/data/recommendations.json — not used by live UI
```

## Your data

| Mode | Where data lives |
|------|------------------|
| **Default** | This browser’s `localStorage` only — each device/profile is separate |
| **Optional cloud** | Supabase (see below) — sign-in syncs library across devices |

**Deployed without Supabase:** everyone who opens your URL still has an isolated library on their own phone/browser until you add env vars and run migrations.

Profile → **Library backup** exports a JSON file; **Import** restores or moves libraries between devices.

## Deploy

See [../docs/DEPLOY.md](../docs/DEPLOY.md).

Quick path: Vercel → import repo → set **Root Directory** to `app` → Deploy.

```bash
npm run build
npm start   # local production smoke test
```

## Optional: Supabase (accounts, sync, friends)

Full checklist: **[`../docs/SUPABASE_SETUP.md`](../docs/SUPABASE_SETUP.md)**.

1. Create a [Supabase](https://supabase.com) project.
2. Run SQL in [`../supabase/migrations/001_reading_nook.sql`](../supabase/migrations/001_reading_nook.sql).
3. Copy [`/.env.example`](.env.example) → `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; friend invites by email)
4. Enable Email auth (magic link); whitelist `/auth/callback` redirect URLs.
5. Add the same env vars on **Vercel**, then redeploy.

When configured, Profile shows **Account** (sign-in + sync status), conflict resolution when device and cloud differ, and Friends (invites, taste, optional read-only shelves).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (tsx) |
