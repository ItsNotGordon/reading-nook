# Supabase setup for Reading Nook

Use this when you want **one library on phone + laptop** and optional **Friends**.

## 1. Create a Supabase project

1. [supabase.com](https://supabase.com) → New project.
2. Note **Project URL** and **anon public** key (Settings → API).
3. Copy **service_role** key (server-only; never expose to the browser).

## 2. Run the database migration

In Supabase → **SQL Editor**, run migrations in order from [`supabase/migrations/`](../supabase/migrations/) (at minimum `001` through the latest numbered file).

This creates `profiles`, `libraries`, `friendships`, `follows`, clubs, and row-level security policies.

**Env tip:** `NEXT_PUBLIC_SUPABASE_URL` must be the project root URL (e.g. `https://xxx.supabase.co`), not the REST path (`.../rest/v1`). After a **custom auth domain** is enabled, use that URL instead.

## 3. Auth URL configuration

**Authentication** → **URL configuration**

| Field | Production example |
|-------|---------------------|
| **Site URL** | `https://reading-nook-beta.vercel.app` |
| **Redirect URLs** | `https://reading-nook-beta.vercel.app/auth/callback` |
| | `http://localhost:3000/auth/callback` |

The app exchanges the OAuth code at [`app/src/app/auth/callback/route.ts`](../app/src/app/auth/callback/route.ts).

## 4. Google OAuth

Sign-in is **Google only** in the app (`signInWithOAuth`).

1. **Google Cloud Console** → OAuth consent screen: app name **Reading Nook**, logo, support email, home page `https://reading-nook-beta.vercel.app`.
2. **Credentials** → OAuth 2.0 Client ID (Web):
   - **Authorized JavaScript origins:** `https://reading-nook-beta.vercel.app`, `http://localhost:3000`
   - **Authorized redirect URIs:** copy from Supabase → **Authentication** → **Providers** → **Google**:
     - `https://<project-ref>.supabase.co/auth/v1/callback`
3. **Supabase** → **Providers** → **Google** → enable; paste Client ID and secret.

**Important:** Google’s redirect URI is the **Supabase** callback, not `/auth/callback` on Vercel. The Vercel callback is only in Supabase **Redirect URLs**.

To stop Google from showing `xxxx.supabase.co` on the account picker, see **[`GOOGLE_OAUTH_BRANDING.md`](GOOGLE_OAUTH_BRANDING.md)** (custom domain + brand verification).

## 5. Environment variables

### Local (`app/.env.local`)

Copy from [`app/.env.example`](../app/.env.example):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Restart `npm run dev` after changing env.

### Vercel (production)

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (or custom domain) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only |
| `NEXT_PUBLIC_SITE_URL` | `https://reading-nook-beta.vercel.app` — must match Supabase Site URL |

Redeploy after adding variables.

## 6. Verify on two devices

1. Open **`/login`** → **Continue with Google**.
2. After redirect, you should reach `/profile` (or the `?next=` path).
3. Sign in on a second device with the same Google account → library syncs after a short delay.

## 7. Friends (optional)

- Both people must sign in and set a **@username** (Profile → Edit profile).
- Use **Friends** → search → **Add friend** / accept requests.
- **Friends** = mutual follows (see migration `017`).

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Google shows random `supabase.co` URL | Expected without custom domain — see [`GOOGLE_OAUTH_BRANDING.md`](GOOGLE_OAUTH_BRANDING.md) |
| `redirect_uri_mismatch` | Google redirect URI must be `https://<ref>.supabase.co/auth/v1/callback` |
| Sign-in loops or “invalid redirect” | Supabase Redirect URLs must include `https://reading-nook-beta.vercel.app/auth/callback` |
| Works locally, fails on Vercel | `NEXT_PUBLIC_SITE_URL` and Supabase Site URL match production origin |
| 503 on `/api/sync` | Supabase env not loaded in that deployment |

## Data safety

- **Export backup** on Profile before clearing data.
- Sign-out keeps this device’s local copy; cloud copy stays tied to your Google account.
