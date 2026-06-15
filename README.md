# WC2026 Picks

A World Cup 2026 prediction game. Players create accounts, predict match scores before kickoff, and earn points automatically when results come in.

**Scoring:**
- +1 point — correct winner (or draw)
- +1 point — exact correct scoreline
- Max 2 points per match · 104 matches total

**Live at:** [wc2026-picks-beta.vercel.app](https://wc2026-picks-beta.vercel.app)

---

## Deploy in ~5 minutes (free forever)

### 1. Set up the database (Neon)

1. Go to [neon.tech](https://neon.tech) → create a free account
2. Create a new project
3. Copy the **Connection string** from the dashboard (looks like `postgresql://user:pass@host/db?sslmode=require`)

### 2. Deploy to Vercel

1. Fork this repo to your GitHub account
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your fork
3. In the **Environment Variables** section, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `SESSION_SECRET` | 32+ random characters (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

4. Click **Deploy**

No football data API key required — match data is fetched from the ESPN public API.

### 3. Set up the database schema

After first deploy, run once from your local machine:

```bash
npm install
DATABASE_URL="your-neon-connection-string" npm run db:push
```

### 4. Load the match schedule

Visit `/matches` after logging in. The page automatically syncs from ESPN on every load — all 104 World Cup 2026 matches (group stage + full knockout bracket) will appear within a few seconds.

---

## Run locally

```bash
cp .env.example .env.local
# fill in DATABASE_URL and SESSION_SECRET in .env.local

npm install
npm run db:push   # create tables in Neon
npm run dev       # start at localhost:3000
```

---

## Features

- **Email + password accounts** with optional demographic profile (age, gender, country, favorite team)
- **Timezone settings** — each user picks their timezone; kickoff times display locally everywhere
- **Match list** — live matches at top with pulsing indicator; upcoming (collapsible, make picks); past results (collapsible); all auto-sync from ESPN on page load
- **Match detail** — scoreline, goal scorers with minute + type (penalty/OG), team statistics, lineup pitch visualization, group standings, and for knockout matches: each team's tournament history
- **Predictions lock at kickoff** — enforced server-side; friends' picks become visible after kickoff
- **Friends' picks** — after kickoff, see every player's prediction with team crests on the match page
- **Knockout bracket** (`/bracket`) — full 32-match bracket with connector lines, prediction badges, and Finals column centered between the Semifinals
- **Leaderboard** (`/leaderboard`) — podium top-3, full table with correct result %, exact score count
- **Auto-scoring** — points award automatically when matches sync after full-time
- **Dark mode** — follows system default; toggle in nav (System / Light / Dark); FOUC-free
- **Live polling** — matches page syncs every time it loads; live matches refresh every 60 seconds automatically
- **Lineup pitch** — portrait pitch view with goal-net visuals at each end, player dots sized by formation row

---

## Data source

All match data comes from the **ESPN unofficial API** (no key required, no rate limits):

| Data | Endpoint |
|---|---|
| Fixtures + scores + status | `/scoreboard?dates=202606&limit=100` (June) + July |
| Goal scorers, cards, stats, lineups, venue | `/summary?event={espnId}` |
| Group standings | `/standings` |

Goal event types handled: `goal`, `goal---header`, `goal---volley`, `penalty---scored`, `own-goal`

---

## Admin endpoints

These endpoints work for any logged-in user with server access (no special role required — designed for the app owner).

| Endpoint | Method | Description |
|---|---|---|
| `/api/matches/sync` | POST | Sync match schedule + scores from ESPN; backfills goal/stat/lineup data for up to 10 recently finished or live matches per call |
| `/api/export` | GET | Download CSV of all players, demographics, and total points |
| `/api/admin/reset` | POST | Delete all matches and predictions |
| `/api/admin/clear-events` | POST | Clear goals/bookings/stats for all matches without touching predictions |

---

## Tech stack

- **Framework** — Next.js 16 (App Router, Turbopack)
- **Database** — Neon Postgres via `@neondatabase/serverless` + Drizzle ORM
- **Auth** — bcryptjs + iron-session (cookie-based, 30-day sessions)
- **Football data** — ESPN unofficial API (no key required)
- **UI** — Tailwind CSS + shadcn/ui (@base-ui/react) + lucide-react
- **Hosting** — Vercel (free tier) + Neon (free tier, no pausing)
