# Deploy Reading Nook

The Next.js app lives in [`app/`](../app/). Deploy that directory as the project root.

## Vercel (recommended)

1. Import the Git repo in [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `app`.
3. Framework preset: **Next.js** (uses [`app/vercel.json`](../app/vercel.json)).
4. Add environment variables from [`app/.env.example`](../app/.env.example) only if you enable Supabase (optional).
5. Deploy.

Build command (default): `npm run build`  
Install command: `npm run build:books` is **not** required for production Add/search/recs.

## Local production check

```bash
cd app
npm run build
npm start
```

## Data model on deploy

- **Without Supabase:** each visitor’s library lives in **browser localStorage** only. Clearing site data or switching devices starts fresh.
- **With Supabase:** sign-in enables cloud library sync and optional friend features (see [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md)).

Document this for anyone you share the URL with.
