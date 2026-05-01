# Inventory

Internal **ECS IT Operations** handheld scan queue: Next.js App Router UI, Supabase table `inventory_items`, and CSV export from the app.

## Prerequisites

- Node 20+
- Supabase project with migrations applied from `supabase/migrations/` (inventory sheet schema)

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

## Flow

Pick your name → **To scan** marks devices live → **Done** opens the scanned-only list with undo confirmation → **Download** exports CSV. Footer shows project attribution.
