# MovieRanker

**Rank your all-time. Share the order.**

Mobile-first web app for building Top 25 / 50 / 75 / 100 movie lists, refining them with pairwise battles, importing Letterboxd ratings, and sharing public or invite-only rankings.

See [PRD.md](./PRD.md) for full product requirements.

## Stack

- **Next.js** (App Router) on Vercel
- **Supabase** (Auth + Postgres + RLS) — optional for local demo
- **TMDB** for movie search/metadata
- **GitHub** for source control

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Without env keys, the app runs in **local demo mode**:

- Lists persist in `localStorage`
- Movie search uses a small built-in catalog (add `TMDB_API_KEY` for live search)
- Auth screens offer “Enter demo”

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Put URL + anon key in `.env.local`
3. Run `supabase/migrations/001_initial.sql` in the SQL editor
4. Enable Email auth (and Google later if you want)

## TMDB setup

1. Request an API key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Set `TMDB_API_KEY` in `.env.local`

## Scripts

| Command     | Description        |
|------------|--------------------|
| `pnpm dev`   | Dev server         |
| `pnpm build` | Production build   |
| `pnpm start` | Run production     |
| `pnpm lint`  | ESLint             |

## Deploy

1. Push to GitHub
2. Import the repo in Vercel
3. Add the same env vars
4. Deploy

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. Letterboxd imports use user-exported CSV only.
