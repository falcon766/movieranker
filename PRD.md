# Product Requirements Document (PRD)
# MovieRanker

**Version:** 0.4 Draft  
**Date:** 2026-07-16  
**Status:** Draft for review  
**Product name (interim):** **MovieRanker** — locked for build; may rebrand later  
**Tagline (interim):** *Rank your all-time. Share the order.*  
**Stack (proposed):** Next.js (Vercel) · Supabase (Auth, Postgres, Storage, RLS) · TMDB API · GitHub  

---

## 1. Vision

Build a mobile-first web app that makes ranking your favorite movies of all time feel addictive, social, and effortless — not like filling out a spreadsheet.

Users create named ranked lists (Top 25 / 50 / 75 / 100 / custom), search movies with rich autocomplete from TMDB, refine order via drag-and-drop **and** pairwise “battle” comparisons, optionally bootstrap from Letterboxd, and share lists publicly or by invite.

**North-star experience:** Open the app → search “Godf…” → drop *The Godfather* into #3 → battle two films when stuck → share a beautiful public list link in under five minutes.

**Long-term wedge:** Taste graphs from ranked lists become a high-signal compatibility layer for a future dating / social product (“movies as personality”).

---

## 2. Problem

People love arguing about movies, but existing tools are weak at *ordered* preference:

| Gap | Today |
|-----|--------|
| Ranked lists | Letterboxd is great for diary/ratings; weak for ordered “all-time” lists with flexible sizes |
| Decision fatigue | Dragging 100 titles is hard; no “help me choose between these two” loop |
| Bootstrap | Starting from scratch ignores years of Letterboxd history |
| Shareability | Rankings are buried in profiles; no gorgeous standalone share pages with privacy controls |
| Mobile UX | Desktop list tools feel clumsy on phone |

---

## 3. Goals & Success Metrics

### 3.1 Product goals (MVP)

1. Create account → create a named list → add/rank movies → save persistently.
2. TMDB-powered search with posters, year, and metadata on select.
3. Smooth reorder (drag/drop + keyboard + tap controls) on mobile and desktop.
4. Pairwise battle mode that updates ranking with transparent scoring.
5. Letterboxd CSV import that seeds candidates and optional score hints.
6. Share: public link **or** invite-only access.
7. Deploy on Vercel; data/auth on Supabase; source on GitHub.

### 3.2 Success metrics (post-launch)

| Metric | Target (first 90 days) |
|--------|-------------------------|
| Time-to-first-saved-list | < 5 minutes median |
| Lists with ≥ 25 movies | ≥ 40% of signed-up users |
| Battle mode used ≥ once | ≥ 35% of list creators |
| Letterboxd import started | ≥ 20% of creators |
| Share link opened by ≥1 non-owner | ≥ 25% of public/invite lists |
| Mobile sessions | ≥ 55% of traffic |
| D1 retention | Track; aim ≥ 25% |

### 3.3 Non-goals (MVP)

- Full social network (follows, feed, comments beyond optional reactions — see later phases)
- Streaming availability / “where to watch” as primary feature
- Official Letterboxd OAuth API (use export CSV; respect their ToS)
- Native iOS/Android apps (PWA-quality web is enough)
- Dating features in MVP (design data model so compatibility can ship later)

---

## 4. Naming & Brand

### 4.1 Recommended shortlist

| Name | Tagline | Why it works | Dating-future fit |
|------|---------|--------------|-------------------|
| **ReelRank** | *Rank what you love. Share what you are.* | Clear, producty, SEO-friendly | “Reel” = film + real personality |
| **TopCut** | *Your all-time list, finally decided.* | Editor’s cut energy; decisive | “Cut” = taste filter for matching |
| **Canon** | *Build your personal film canon.* | Cultural weight; list as identity | Canon compatibility = shared sacred texts |
| **Stack** | *Stack your favorites. Defend the order.* | Casual, mobile, ranking metaphor | Stacks as taste vectors |
| **Auteur** | *You are what you rank.* | Prestige, identity-forward | Strong dating brand (taste = self) |
| **TwentyFive** | *Start with 25. Go as deep as you want.* | Concrete, memorable ritual | “Show me your 25” as icebreaker |
| **FightFrame** | *When you can’t decide, make them fight.* | Battle mode as hero feature | Playful couple’s game mode |
| **Marquee** | *Your name above the titles that matter.* | Theatrical, share-page vibes | Marquee as profile showcase |
| **TasteOff** | *Settle the argument. Keep the list.* | Competitive + social | Direct bridge to dating games |
| **Listlight** | *All-time favorites, without the homework.* | Soft, approachable | Low-friction onboarding for couples |

### 4.2 Stronger “dating-ready” names (if brand leans social early)

| Name | Tagline |
|------|---------|
| **Chemistry Cut** | *Match on what you put at #1.* |
| **Double Feature** | *Your list. Their list. The overlap.* |
| **Same Wavelength** | *Find people who rank like you.* |
| **Opening Night** | *First date energy, all-time taste.* |

### 4.3 Naming recommendation — UPDATE (2026-07-16)

**`ReelRank` is already taken** in the movie space and should not be our launch name.

| Conflict | What it is | URL |
|----------|------------|-----|
| **ReelRank** | Live ad-free movie community (reviews, logs, “reels” lists, free watch) | [reelrank.net](https://reelrank.net/) |
| **ReelRank** | Unrelated fishing-circuit SaaS | [reelrank.app](https://www.reelrank.app/) |
| **ReelRanker** | Student/Flutter media journal (TMDB + AI) | GitHub `AlexGarcia51304/ReelRanker` |
| **Reel** | Separate social ranking app (head-to-head matchups) | [reeltheapp.com](https://reeltheapp.com/) |

Trademark risk + SEO collision + user confusion = **rename before build branding hardens**.

#### Recommended replacements (same spirit as ReelRank)

| Name | Tagline | Notes |
|------|---------|-------|
| **CanonCut** | *Your all-time list, finally cut.* | Editor’s-cut + personal canon; dating: “compare cuts” |
| **Rankreel** | *Spin the reel. Lock the order.* | Close to ReelRank but distinct; verify domains |
| **Marquee100** | *Your name above the titles that matter.* | Share-page hero brand; “show me your Marquee” |
| **Auteurlist** | *You are what you rank.* | Prestige, identity; dating-ready |
| **FrameOrder** | *Settle the frame. Keep the order.* | Battle + rank in one name |
| **TopSprocket** | *All-time favorites, frame by frame.* | Distinctive, film-mech texture |
| **Listnoir** | *Rank in the dark. Share in the light.* | Gorgeous dark cinematic brand fit |
| **TwentyFive** | *Start with 25. Go as deep as you want.* | Ritual product; easy icebreaker later |

**Decision (2026-07-16):** Ship under **MovieRanker** for now.  
Repo, product copy, and UI brand as MovieRanker until a future rename. Naming appendices retained for a later rebrand.

### 4.4 Visual & brand principles — “as gorgeous as possible”

Design bar: **cinematic product**, not SaaS dashboard. Texture, depth, and motion are first-class requirements.

#### Atmosphere
- Multi-layer backgrounds: soft poster-bloom (blurred backdrop from list art), film grain overlay, subtle vignette, light-leak / projection-haze gradients — never a flat single fill.
- Depth via stacked planes (z-layers): ambient glow → grain → content → glass panels → sticky chrome — not heavy card grids.
- Poster art is the primary visual material; UI chrome stays secondary.

#### Typography & layout
- Expressive display + refined body (no Inter/Roboto/system-default stack as the brand voice).
- Marketing first viewport = one composition: brand, one headline, one line of support, one CTA group, one dominant visual plane (full-bleed).
- Rank editor: calm, precious, poster-forward; battle mode: larger kinetic gestures.

#### Interaction craft
- Intentional motion (2–3 signature moments minimum): list insert, rank swap, battle reveal.
- Mobile-first touch targets; drag feels physical; battle taps feel decisive.
- Share pages and OG images must look like editorial film posters, not generic link cards.

#### Anti-patterns (explicit)
- Purple-on-white / purple–indigo AI gradients  
- Generic cream + terracotta “editorial template”  
- Dense broadsheet / hairline-newspaper layouts  
- Card spam, pill clusters, stat strips in the hero  
- Glow-for-glow’s-sake neon chrome  

#### Design system deliverables (build phase)
- CSS variables for color, elevation, grain opacity, motion easing  
- Texture assets (grain tile, optional scratch/dust at low opacity)  
- Component recipes: `PosterTile`, `RankRow`, `BattleStage`, `GlassSheet`, `MarqueeHero`

---

## 5. Personas

1. **The Canon Builder** — Wants a definitive Top 50; revisits quarterly; shares with friends.
2. **The Letterboxd Veteran** — Thousands of ratings; hates starting from zero; wants import → refine.
3. **The Indecisive Ranker** — Loves movies, freezes on #11 vs #12; needs battle mode.
4. **The Sharer** — Cares about the public page; wants invite-only for a group chat / partner.
5. **Future: The Matcher** — Uses ranked taste as a signal for dates / friends (Phase 3+).

---

## 6. User Journeys

### 6.1 Happy path — new user

1. Land on marketing page → “Start your list”
2. Sign up (email/password or OAuth: Google / Apple)
3. Create list: name + target size (25/50/75/100/custom)
4. Search movies → add to list (or to a “bench” / watchlist of candidates)
5. Reorder via drag or battle mode
6. Save (autosave) → Share (public or invite)

### 6.2 Letterboxd bootstrap

1. Settings → Import Letterboxd
2. Instructions: export ratings CSV from Letterboxd
3. Upload CSV → map titles to TMDB IDs (fuzzy match + manual resolve)
4. Choose: seed bench only / auto-fill top N by rating / both
5. Continue ranking with battles informed by imported scores

### 6.3 Viewer of shared list

1. Open `/u/{username}/lists/{slug}` or short link
2. If public: view ranked posters + notes
3. If invite-only: enter invite or be logged-in invitee
4. Optional: “Make your own” CTA

### 6.4 Stuck on ranking — battle

1. From list → “Battle”
2. System proposes two candidates (near each other in rank, or contested)
3. User picks winner (Hot-or-Not style)
4. Elo / pairwise updates suggested order; user can accept batch or apply live
5. Exit when confidence is high enough or user is done

---

## 7. Feature Requirements

### 7.1 Accounts & auth

| ID | Requirement | Priority |
|----|-------------|----------|
| A1 | Email/password signup & login via Supabase Auth | P0 |
| A2 | OAuth: Google (Apple nice-to-have) | P0 / P1 |
| A3 | Password reset | P0 |
| A4 | User profile: display name, username (unique), avatar | P0 |
| A5 | Session persistence across devices | P0 |
| A6 | Delete account + cascade delete lists (GDPR-ish) | P1 |

### 7.2 Lists

| ID | Requirement | Priority |
|----|-------------|----------|
| L1 | Create list with custom title | P0 |
| L2 | Target size presets: 25, 50, 75, 100, custom (1–250) | P0 |
| L3 | Soft cap warning when exceeding target; allow overflow or enforce (setting) | P1 |
| L4 | Multiple lists per user | P0 |
| L5 | List description / subtitle | P1 |
| L6 | List visibility: private, unlisted/public link, invite-only | P0 |
| L7 | Duplicate list / “start from this list” | P2 |
| L8 | Archive / delete list | P0 |
| L9 | Per-item optional note (short) | P1 |
| L10 | Autosave ranks within ~1s of change; conflict-safe last-write with timestamp | P0 |

### 7.3 Movie search & catalog (TMDB)

> **Note:** Spec assumes **TMDB** (The Movie Database), not Gracenote TMS. TMDB is the standard free/dev-friendly movie metadata API. If Gracenote TMS is required for licensing reasons, that is a separate integration track.

| ID | Requirement | Priority |
|----|-------------|----------|
| M1 | Typeahead search (debounced) by title | P0 |
| M2 | Results show poster, title, year, media type (movie) | P0 |
| M3 | Select → store TMDB id + snapshot fields (title, year, poster path) | P0 |
| M4 | Prevent duplicate movie in same list | P0 |
| M5 | “Because you ranked X…” suggestions (genre/cast/keyword adjacency) | P1 |
| M6 | Popular / trending discovery shelf for empty lists | P1 |
| M7 | Local cache of TMDB payloads to reduce API calls | P1 |
| M8 | TV shows out of scope for MVP (schema allows later) | — |

### 7.4 Ranking UX

| ID | Requirement | Priority |
|----|-------------|----------|
| R1 | Drag-and-drop reorder (mobile-friendly library) | P0 |
| R2 | Move up / down / to position via controls | P0 |
| R3 | Insert at position when adding | P0 |
| R4 | Bench / candidates pool (unranked shortlist) | P0 |
| R5 | Keyboard accessibility for reorder | P1 |
| R6 | Undo last rank change | P1 |
| R7 | Progress toward target size | P0 |

### 7.5 Battle mode (“Hot or Not” / Fight)

| ID | Requirement | Priority |
|----|-------------|----------|
| B1 | Present two movies; user picks preferred | P0 |
| B2 | Pairing strategy: adjacent ranks, random from list+bench, “uncertain” pairs | P0 |
| B3 | Update scores via Elo (or TrueSkill-lite); derive suggested order | P0 |
| B4 | User can battle list-only, bench-only, or mixed | P1 |
| B5 | Session goals: N battles or “until stable” | P1 |
| B6 | Show rank delta after each pick (subtle animation) | P1 |
| B7 | Skip / “too close to call” (draw → smaller Elo delta) | P1 |
| B8 | Battle history stored for recompute / audit | P1 |
| B9 | Couple’s / guest battle later (dating wedge) | P3 |

**Scoring sketch (MVP):**  
- Each list item has `elo` (default 1000) and `rank_position` (1..N).  
- Battle updates Elo; list re-sorts by Elo unless user has “manual lock” on positions.  
- Alternative mode: battles only propose swaps; user confirms (more control, less magic).  
**Decision needed:** auto-apply Elo vs suggest-and-confirm (see Open Questions).

### 7.6 Letterboxd import

| ID | Requirement | Priority |
|----|-------------|----------|
| I1 | Upload Letterboxd `ratings.csv` (and optionally `watched.csv` / `diary.csv`) | P0 |
| I2 | Parse title, year, rating (0.5–5 stars) | P0 |
| I3 | Match to TMDB via title+year; queue unmatched for manual pick | P0 |
| I4 | Import modes: Bench seed · Prefill top N by rating · Initialize Elo from stars | P0 |
| I5 | Idempotent re-import (don’t duplicate) | P1 |
| I6 | Clear guidance UI + link to Letterboxd export docs | P0 |
| I7 | No scraping of Letterboxd HTML; CSV only | P0 |

### 7.7 Sharing & privacy

| ID | Requirement | Priority |
|----|-------------|----------|
| S1 | Public list page with OG image (poster collage) | P0 |
| S2 | Unlisted: reachable by link, not in public directory | P0 |
| S3 | Invite-only: email or magic invite link with role `viewer` | P0 |
| S4 | Owner can rotate/revoke invite links | P1 |
| S5 | Optional username public profile listing public lists | P1 |
| S6 | Copy link / native share sheet on mobile | P0 |
| S7 | Embeddable block (Phase 2) | P2 |

### 7.8 Suggestions engine (post-select)

| ID | Requirement | Priority |
|----|-------------|----------|
| G1 | After adding a film, suggest similar TMDB results | P1 |
| G2 | Suggest from Letterboxd high-rated not yet on list | P1 |
| G3 | “Hole filler”: genres underrepresented vs user’s imported taste | P2 |

---

## 8. Information Architecture

```
/                       Marketing
/login /signup
/app                    Dashboard (my lists)
/app/lists/new
/app/lists/[listId]     Editor (rank + bench + battle)
/app/lists/[listId]/battle
/app/import/letterboxd
/app/settings
/u/[username]           Public profile
/u/[username]/[slug]    Shared list
/invite/[token]         Accept invite
```

---

## 9. Data Model (Supabase / Postgres)

### 9.1 Core tables

**profiles**  
`id (uuid, fk auth.users)`, `username`, `display_name`, `avatar_url`, `bio`, `created_at`

**lists**  
`id`, `owner_id`, `title`, `slug`, `description`, `target_size`, `visibility` (`private`|`unlisted`|`public`|`invite`), `allow_overflow`, `created_at`, `updated_at`

**list_items**  
`id`, `list_id`, `tmdb_id`, `title`, `year`, `poster_path`, `position` (nullable if bench), `elo`, `notes`, `source` (`manual`|`letterboxd`|`suggestion`), `locked` (bool), `created_at`

**battles**  
`id`, `list_id`, `winner_item_id`, `loser_item_id`, `is_draw`, `elo_winner_before/after`, `elo_loser_before/after`, `created_at`, `user_id`

**invites**  
`id`, `list_id`, `token`, `email` (nullable), `role`, `expires_at`, `revoked_at`, `created_by`

**letterboxd_imports**  
`id`, `user_id`, `filename`, `row_count`, `matched_count`, `status`, `created_at`

**letterboxd_ratings**  
`id`, `user_id`, `import_id`, `name`, `year`, `rating`, `tmdb_id` (nullable), `match_status`

**tmdb_cache**  
`tmdb_id`, `payload jsonb`, `fetched_at`

### 9.2 RLS principles

- Owners full CRUD on their lists/items/battles.
- Public/unlisted lists: `SELECT` for items if visibility allows.
- Invite-only: `SELECT` if valid invite or membership row.
- Never expose private lists via API without authz.

### 9.3 Dating-future fields (do not build UI yet)

- `taste_embedding` / taste vector derived from ranked TMDB ids + Elo  
- `compatibility_opt_in` on profiles  
- Shared `battle_sessions` with two user ids  

Design rankings so we can compute overlap, Spearman distance, and shared top-N without schema rewrites.

---

## 10. Technical Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js    │────▶│  Supabase    │────▶│  Postgres   │
│  (Vercel)   │     │  Auth + RLS  │     │  + Storage  │
└──────┬──────┘     └──────────────┘     └─────────────┘
       │
       ├──── TMDB API (server-side proxy; API key never in client)
       │
       └──── Letterboxd CSV parse (client or edge function)
```

### 10.1 Frontend

- Next.js App Router, TypeScript, Tailwind
- Optimistic UI for reorders
- Framer Motion (or CSS) for battle transitions — intentional motion, not noise
- PWA meta for “Add to Home Screen”

### 10.2 Backend

- Supabase for auth/DB/storage
- Next.js Route Handlers / Server Actions for TMDB proxy, OG image generation, import match jobs
- Rate-limit TMDB proxy per user/IP

### 10.3 Infra & DevEx

- GitHub repo + PR workflow
- Vercel preview deployments per PR
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE` (server only), `TMDB_API_KEY`
- Optional: Supabase staging project

---

## 11. UX Requirements (mobile-first)

1. Thumb-zone primary actions: Add, Battle, Share.
2. Battle UI: two large posters, full-width tap targets, swipe left/right optional.
3. List editor: poster + title + rank number; drag handle obvious.
4. Empty states with one clear CTA (Import Letterboxd or Search).
5. Share page must look great in iMessage / Twitter / IG link previews (OG).
6. Offline: not required MVP; show clear errors if network drops mid-save.

---

## 12. Phased Roadmap

### Phase 0 — Foundation (Week 1)
- Repo, Next.js, Supabase schema + RLS, auth, basic list CRUD, TMDB search proxy

### Phase 1 — MVP Ranker (Weeks 2–3)
- Drag reorder, bench, target sizes, autosave, public/unlisted share pages

### Phase 2 — Battle + Import (Weeks 3–5)
- Battle mode + Elo, Letterboxd CSV import + match UI, invite-only lists, OG images

### Phase 3 — Delight & Growth (Weeks 5–7)
- Suggestions, profile pages, polish, analytics, performance

### Phase 4 — Social / Dating wedge (Future)
- Compare two lists (overlap, disagreements)
- “Battle together” live session
- Compatibility score from taste vectors
- Export/embed for partner apps
- Opt-in discovery: “people with similar canons”

---

## 13. Analytics & Events (privacy-aware)

Track (PostHog or Vercel Analytics + custom):  
`signup`, `list_created`, `movie_added`, `reorder`, `battle_started`, `battle_vote`, `letterboxd_upload`, `import_matched`, `share_created`, `share_viewed`, `invite_accepted`

No selling of taste data. Clear privacy copy if compatibility features launch.

---

## 14. Compliance, ToS, Content

- TMDB attribution required in UI/footer per their terms.
- Letterboxd: user-provided export only; no scraping; disclaimer that Letterboxd is unaffiliated.
- User-generated list titles/notes: basic abuse reporting (P2).
- Age: 13+ (or 16+ EU) standard auth copy; dating features later may require 18+.

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| TMDB rate limits | Server cache, debounce, batch details |
| Letterboxd title mismatches | Manual resolve UI; year disambiguation |
| Elo feels “wrong” vs mental ranking | Suggest-and-confirm mode; locks; reset Elo |
| Scope creep into social network | Hard phase gates |
| Dating pivot dilutes MVP | Keep compatibility as derived data only until Phase 4 |

---

## 16. Open Questions (need your call)

1. **Official product name** — ReelRank / Canon / FightFrame / other?
2. **TMDB vs Gracenote TMS** — Confirm TMDB for MVP?
3. **Battle behavior** — Auto-reorder from Elo, or propose swaps for confirmation?
4. **Max list size** — 100 soft / 250 hard OK?
5. **Auth providers** — Email + Google enough for MVP?
6. **Invite-only** — Magic link only, or email-gated too?
7. **Username required at signup** or later?
8. **Monetization later?** — Free forever / Pro (unlimited lists, custom OG, private analytics)?
9. **Dating timeline** — Purely future narrative, or design marketing site with “coming: compare taste”?
10. **GitHub** — New repo under your user/org? Private or public?

---

## 17. Support Needed From You (to build next)

To implement after PRD approval, please provide / decide:

| Item | Why |
|------|-----|
| Product name + tagline pick | Branding, repo rename, domains |
| GitHub username/org + repo visibility | `gh repo create`, remote |
| Supabase project (or allow me to guide creation) | Auth + DB URL/keys |
| TMDB API key | Search + metadata ([themoviedb.org](https://www.themoviedb.org/settings/api)) |
| Vercel account access / link to GitHub | Deploy |
| Auth preferences | Google OAuth client IDs if using Google |
| Design lean | Cinematic dark vs light editorial vs playful battle-forward |
| Sample Letterboxd CSV | Optional, for import testing |
| Domain (optional) | Custom domain on Vercel |

I can scaffold the full app once name + stack credentials path are clear. Env keys can stay local; I will not commit secrets.

---

## 18. MVP Acceptance Criteria

MVP is done when a user can:

1. Sign up and log in.  
2. Create a list named arbitrarily with target size 25–100.  
3. Search TMDB and add unique movies with posters.  
4. Reorder on mobile and desktop; changes persist after refresh.  
5. Run ≥10 battles and see ranking update (per chosen battle policy).  
6. Upload Letterboxd ratings CSV and get matched candidates into bench/list.  
7. Share via public/unlisted link and via invite-only link that blocks outsiders.  
8. App is deployed on Vercel from GitHub with Supabase backend.

---

## 19. Appendix — Example Copy

**Hero (ReelRank):**  
**ReelRank**  
*Rank what you love. Share what you are.*  
Start a Top 25 — or go all the way to 100. Import Letterboxd. Battle it out when you’re stuck.

**Share page eyebrow:**  
*{Name}’s Canon* · Top {N}

**Battle prompt:**  
*Which one stays higher?*

**Dating teaser (footer, optional):**  
Soon: compare canons with someone else. Taste is a love language.

---

## 20. Document History

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-07-16 | Initial draft from product conversation; naming + dating-future wedge added |
| 0.2 | 2026-07-16 | ReelRank taken; visual bar raised; naming shortlist expanded |
| 0.3 | 2026-07-16 | Added 50-name brainstorm appendix |
| 0.4 | 2026-07-16 | Locked interim name: MovieRanker |

---

## Appendix A — 50 Name & Tagline Candidates

*Brainstorm only. Clear domains/trademarks before committing. Avoids “ReelRank.”*

### Cinematic / projector

1. **Lumenlist** — *Rank what still glows.*
2. **Sprocket** — *Order the frames that made you.*
3. **Gatecut** — *Where your favorites make the cut.*
4. **Keylight** — *The titles that light you.*
5. **Slateorder** — *Action. Ranked.*
6. **Printlock** — *Lock the print. Keep the order.*
7. **Flickerlane** — *Your all-time, flickering into place.*
8. **Boothlist** — *Projection-booth serious about favorites.*

### Prestige / canon

9. **Canonroom** — *A private room for public taste.*
10. **Sacredreel** — *The films you’d defend at dinner.*
11. **Auteurstack** — *Stack like a director. Share like a fan.*
12. **Firstprint** — *Your definitive first print of taste.*
13. **Vaulted** — *All-time favorites, vaulted and ranked.*
14. **Criterion of One** — *Your personal criterion, ordered.*
15. **Hallowed25** — *Twenty-five holy titles. Or a hundred.*

### Battle / decisive

16. **Twinframe** — *Two posters. One higher place.*
17. **Prefer** — *Stop scoring. Start preferring.*
18. **Highercut** — *When it’s close, cut higher.*
19. **Versuslist** — *Every rank earned in a fight.*
20. **Gutcut** — *Trust the gut. Keep the list.*
21. **Clashprint** — *Make them clash. Keep the print.*
22. **Pickward** — *Pick. Climb. Repeat.*

### Identity / dating-ready

23. **Tastevector** — *Your taste, plotted.*
24. **Overlap** — *Find where your lists kiss.*
25. **Samecut** — *Same cut. Different lives. Maybe not.*
26. **Softspot** — *Your soft spots, in hard order.*
27. **Myopening** — *Show them your opening titles.*
28. **Chemistrycut** — *Match on what you put at one.*
29. **Doublebill** — *Your bill. Their bill. The double.*
30. **Wavelength** — *Rank yours. Find your wavelength.*

### Ritual / product-clear

31. **Topspine** — *The spine of your taste.*
32. **Alltimer** — *Build your all-timer. Defend it.*
33. **Rankritual** — *A ritual for people who care too much.*
34. **Fiftydeep** — *Go twenty-five. Go fifty. Go under.*
35. **Orderofmine** — *An order of movies. Entirely yours.*
36. **Listlock** — *Search. Drop. Lock the order.*
37. **Benchtoone** — *From the bench to number one.*

### Texture / gorgeous-brand

38. **Grain & Order** — *Taste with texture.*
39. **Velvetrank** — *Soft light. Hard rankings.*
40. **Noirlist** — *Rank in the dark. Share in the light.*
41. **Emberframe** — *The films that still burn.*
42. **Gildframe** — *Gold-leaf your all-time.*
43. **Dusklist** — *After the credits, the real list begins.*
44. **Halation** — *Where favorites bloom and settle.*

### Clever / inventive

45. **Intertitle** — *Your life, interrupted by better movies.*
46. **Secondact** — *Act one was watching. Act two is ranking.*
47. **Endcrawl** — *Stay for the ranking.*
48. **Stinger** — *The twist: you have to choose.*
49. **Macguffin** — *The thing that matters is the order.*
50. **Finalframe** — *Leave them on your final frame.*

### Quick shortlist from this 50 (agent pick)

| Tier | Names |
|------|--------|
| Brand-forward gorgeous | **Halation**, **Emberframe**, **Velvetrank**, **Noirlist** |
| Product-clear | **Prefer**, **Alltimer**, **Listlock**, **Topspine** |
| Dating wedge | **Overlap**, **Samecut**, **Doublebill**, **Wavelength** |
| Battle hero | **Twinframe**, **Gutcut**, **Highercut** |

---

## Appendix B — 25 more: plays on “rank” / “top”

1. **Ranknoir** — *Hard light. Harder rankings.*
2. **Rankroom** — *A room where order is sacred.*
3. **Rankripe** — *Taste, ranked at peak.*
4. **Ranksmith** — *Forge your all-time order.*
5. **Rankvelvet** — *Soft seats. Sharp ranks.*
6. **Rankhalo** — *The glow around your top titles.*
7. **Rankbloom** — *Watch your top grow into place.*
8. **Rankcraft** — *Hand-built hierarchies of love.*
9. **TrueRank** — *Not a score. A truth.*
10. **Rankworthy** — *Only what earns the climb.*
11. **Topograph** — *Map the peaks of your taste.*
12. **Topsoil** — *Where favorites take root—at the top.*
13. **Topcut** — *Editor’s cut of your all-time.*
14. **Topkind** — *Your kind of top. Ordered.*
15. **Topward** — *Everything climbing toward one.*
16. **Topography of Taste** — *Peaks, valleys, undisputed ones.*
17. **Topdrawer** — *Only drawer-worthy films. Ranked.*
18. **Topspin** — *Give your favorites a spin to the top.*
19. **Topographica** — *A atlas of what you’d defend.*
20. **Rankladder** — *Climb it one battle at a time.*
21. **Ranktide** — *Favorites rise. The order settles.*
22. **Ranklight** — *Lit by what you put on top.*
23. **Ontopograph** — *Stay on top of what you love.*
24. **Topcanon** — *Your canon—crowned, numbered.*
25. **Rank&Frame** — *Frame it. Rank it. Share it.*
