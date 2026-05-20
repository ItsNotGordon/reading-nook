# Supabase setup for Reading Nook

Use this when you want **one library on phone + laptop** and optional **Friends**.

## 1. Create a Supabase project

1. [supabase.com](https://supabase.com) → New project.
2. Note **Project URL** and **anon public** key (Settings → API).
3. Copy **service_role** key (server-only; never expose to the browser).

## 2. Run the database migration

In Supabase → **SQL Editor**, paste and run:

[`supabase/migrations/001_reading_nook.sql`](../supabase/migrations/001_reading_nook.sql)

Then run [`supabase/migrations/002_profiles_username.sql`](../supabase/migrations/002_profiles_username.sql) for **@username** friend search.

Then run [`supabase/migrations/003_profiles_avatar.sql`](../supabase/migrations/003_profiles_avatar.sql) for **profile photos** (Storage bucket `avatars`).

Then run [`supabase/migrations/004_friends_always_share_library.sql`](../supabase/migrations/004_friends_always_share_library.sql) so **accepted friends** can always read each other's libraries (no shelf-sharing toggle).

This creates `profiles`, `libraries`, `friendships`, and row-level security policies.

**Env tip:** `NEXT_PUBLIC_SUPABASE_URL` must be the project root URL (e.g. `https://xxx.supabase.co`), not the REST path (`.../rest/v1`).

## 3. Enable magic-link email auth

1. **Authentication** → **Providers** → **Email** → enable.
2. **Authentication** → **URL configuration**:
   - **Site URL:** your production URL (e.g. `https://your-app.vercel.app`)
   - **Redirect URLs** (add all that apply):
     - `https://your-app.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback` (local dev)

Magic links expire quickly; open the link on the **same class of device** (phone vs desktop) you started from when possible.

## 3b. Google OAuth (recommended)

Google sign-in avoids Supabase email rate limits during development.

1. **Google Cloud Console** → APIs & Services → **Credentials** → Create **OAuth 2.0 Client ID** (Web application).
2. **Authorized redirect URI:** copy from Supabase → **Authentication** → **Providers** → **Google** (looks like `https://<project-ref>.supabase.co/auth/v1/callback`).
3. **Supabase** → **Authentication** → **Providers** → **Google** → enable; paste **Client ID** and **Client Secret**.
4. Confirm **Redirect URLs** (Authentication → URL configuration) still include your app callback:
   - `https://reading-nook-beta.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`
5. Keep **Email** enabled if you want magic-link fallback.

No extra app env vars — credentials live in Supabase. Same email on Google and magic link may auto-link depending on Supabase **Automatic linking** settings.

## 4. Environment variables

### Local (`app/.env.local`)

Copy from [`app/.env.example`](../app/.env.example):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Restart `npm run dev` after changing env.

### Vercel (production)

Project → **Settings** → **Environment Variables** (Production + Preview if you use preview URLs):

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional (reserved for future admin tasks) |

Redeploy after adding variables.

## 5. Verify on two devices

1. Open your deployed app → **`/login`** or **Profile** → **Account**. Set a **@username** in Edit profile (required for Friends).
2. You should **not** see “local storage only” — use **Continue with Google** or email magic link.
3. Sign in on **phone** with books in local library → first sign-in should upload or prompt if cloud also has data.
4. Sign in on **laptop** with the **same email** → library should match after sync (~2s debounce).
5. Add a book on one device → appears on the other after a short delay.

## 6. Friends (optional)

- Both people must sign in and set a **@username** (Profile → Edit profile). Usernames are 3–24 characters: lowercase letters, numbers, and underscore only.
- Use **Friends** → search usernames → open a profile → **Add friend**.
- The other person accepts or declines under **Incoming requests**; you can cancel **Sent requests**.
- **Share shelves with friends** (Profile → Account) is opt-in; without it, friends only see taste stats you allow via the API.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| “Local storage only” on Profile | Env vars missing on Vercel or wrong root directory (`app`) |
| Magic link doesn’t sign in | Redirect URL not whitelisted; link opened in different browser profile |
| Google sign-in fails or loops | Google redirect URI must be Supabase `.../auth/v1/callback`; app `/auth/callback` in Supabase Redirect URLs |
| Invite: “No account with that email” | Friend must sign in once before invite |
| Sync conflict dialog | Both devices had different libraries; pick device or cloud |
| 503 on `/api/sync` | Supabase env not loaded in that deployment |

## Data safety

- **Export backup** on Profile before clearing data.
- Sign-out keeps this device’s local copy; cloud copy stays tied to your email.
- JSON backup remains the escape hatch if you turn off cloud later.
