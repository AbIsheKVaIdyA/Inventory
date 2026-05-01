# Inventory

Internal **ECS IT Operations** handheld scan queue: Next.js App Router UI, Supabase Auth (**invite-only**), table `inventory_items`, and CSV export.

## Prerequisites

- Node 20+
- Supabase project with migrations applied from `supabase/migrations/` (inventory sheet schema)

## Environment

Create `.env.local` (same keys as `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` — e.g. `http://localhost:3000` in dev and your deployed URL on Vercel

## Authentication (invite-only)

1. In Supabase **Authentication → Sign In / Providers**: enable **Email**, then **disable public sign-ups** (so only invited users exist).
2. Under **Authentication → URL configuration**:
   - **Site URL** = your deployed app URL (or `http://localhost:3000` for local dev).
   - **Redirect URLs** must include `{SITE_URL}/auth/callback` (and the localhost variant for dev).
3. In **Authentication → Users**, use **Invite user** for each teammate. They open the email, land on `/set-password` to create a password once, then sign in at `/login` with email + password.

Scans record **`scanned_by`** as the signed-in **email**. Only people you invite exist in Auth, so strangers cannot obtain an account from the app UI.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000 → /login
npm run lint
npm run build
```

## Flow

Sign in → **To scan** marks devices live → **Done** opens the scanned-only list with undo confirmation → **Download** exports CSV. Footer shows project attribution.
