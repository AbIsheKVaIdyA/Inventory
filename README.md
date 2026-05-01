# Inventory

Internal **ECS IT Operations** handheld scan queue: Next.js App Router UI, Supabase table `inventory_items`, optional CSV download and Google Sheets sync.

## Prerequisites

- Node 20+
- Supabase project with migrations applied from `supabase/migrations/` (inventory sheet schema)

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional Sheets sync: see `.env.example` for server vars used by `POST /api/sync-to-sheets`.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

## Flow

Pick your name → **To scan** marks devices live → **Done** opens the scanned-only list with undo confirmation. Footer shows project attribution.
