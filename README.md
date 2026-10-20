# Inventory

Internal **ECS IT Operations** handheld scan queue: Next.js App Router UI, Supabase Auth (**invite-only**), table `inventory_items`, and Excel (`.xlsx`) export.

## Prerequisites

- Node 20+
- Supabase project with migrations applied from `supabase/migrations/` (inventory sheet schema)

## Environment

Create `.env.local` from `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional, **recommended**) — used by `/api/auth/finalize-invite` so invited users can sign in with email/password after setting a password. Add the same key in Vercel env for Production.

In Supabase **Authentication → URL configuration**, set **Site URL** and **Redirect URLs** to your real app origin (e.g. `http://localhost:3000` in dev); the app does not read a separate site URL from env.

## Authentication (invite-only)

1. In Supabase **Authentication → Sign In / Providers**: enable **Email**, then **disable public sign-ups** (so only invited users exist).
2. Under **Authentication → URL configuration**:
   - **Site URL** = your deployed app URL (or `http://localhost:3000` for local dev).
   - **Redirect URLs** must include `{SITE_URL}/auth/callback` (and the localhost variant for dev).
3. In **Authentication → Users**, use **Invite user** for each teammate. They open the email, land on `/set-password` to create a password once, then sign in at `/login` with email + password.

Scans record **`scanned_by`** as the signed-in **email**. Only people you invite exist in Auth, so strangers cannot obtain an account from the app UI.

## Roles

Migration `0010_roles_departments.sql` adds a role per account (`user_profiles`), enforced by row level security:

| Role | Lands on | Can use |
|---|---|---|
| Admin | `/admin` (overview) | Everything, plus **Users** (`/admin/users`) and **Room mapping** (`/admin/rooms`) |
| ECS IT | `/requests` | Approve / reject devices registered by departments |
| Department | `/department` | Their department's systems + **Register a device** |
| Scan team | `/dashboard` | Scan queue and room submissions |
| No access yet | `/no-access` | Nothing until an admin assigns a role |

Accounts that exist when the migration runs become **Scan team**; new invites start as **No access yet**. Promote the first admins with `supabase/scripts/set_admins.sql`, then manage everyone else from `/admin/users`. Devices belong to a department through **Room mapping** (room → department).

## Commands

```bash
npm install
npm run dev      # http://localhost:3000 → /login
npm run lint
npm run build
```

## Flow

Sign in → **To scan** marks devices live → **Done** opens the scanned-only list with undo confirmation → **Download spreadsheet** exports an `.xlsx` workbook. Footer shows project attribution.

## Public room info form (no login)

Share **`/rooms`** (e.g. `https://your-app.vercel.app/rooms`). Submitters enter person details once, add multiple rooms, then submit. Rows land in Supabase table `room_assignments`. Apply migration `supabase/migrations/0004_room_assignments.sql` first, and edit `room_departments` / `room_buildings` lists as needed.
