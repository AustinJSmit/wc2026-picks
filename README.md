# WC2026 Picks

A World Cup 2026 prediction game. Players create accounts, predict match scores before kickoff, and earn points automatically when results come in. Leaderboard persists through the whole tournament.

**Scoring:**
- +1 point — correct winner (or draw)
- +1 point — exact correct scoreline
- Max 2 points per match

---

## Deploy in ~10 minutes (free forever)

### 1. Set up the database (Neon)

1. Go to [neon.tech](https://neon.tech) → create a free account
2. Create a new project
3. Copy the **Connection string** from the dashboard (looks like `postgresql://user:pass@host/db?sslmode=require`)

### 2. Get a football data API key (API-Sports)

1. Sign up for free at [api-sports.io](https://api-sports.io)
2. Go to your dashboard → click your profile/account icon → copy your **API key**
3. The free tier gives 100 requests/day — plenty for a prediction game

### 3. Deploy to Vercel

1. Fork this repo to your GitHub account
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your fork
3. In the **Environment Variables** section, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `SESSION_SECRET` | 32+ random characters (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `API_FOOTBALL_KEY` | Your api-sports.io API key |
| `ADMIN_EMAIL` | Your email (grants access to admin endpoints) |

4. Click **Deploy**

### 4. Set up the database schema

After first deploy, run this once from your local machine:

```bash
npm install
DATABASE_URL="your-neon-connection-string" npm run db:push
```

### 5. Load the match schedule

Log in to the app, go to **Matches**, and click **Sync results**. This loads all World Cup 2026 matches. Hit Sync a second time to backfill goal scorer and booking data for finished matches.

---

## Run locally

```bash
cp .env.example .env.local
# fill in your values in .env.local

npm install
npm run db:push        # create tables in Neon
npm run dev            # start at localhost:3000
```

---

## Features

- **Email + password accounts** with optional demographic profile (age, gender, country, favorite team)
- **Timezone settings** — each user picks their timezone; kickoff times display locally across the app. Auto-detected from browser on signup
- **Leaderboard** — live standings across all players, visible to anyone
- **Match schedule** — upcoming (predict) and past (results + your points)
- **Match events + statistics** — finished matches show goal scorers, assists, bookings (yellow/red cards with player + minute), and match statistics (possession, shots, fouls, corners)
- **Predictions lock at kickoff** — enforced server-side, not just in the UI
- **Auto-scoring** — hit Sync after matches finish; points award automatically
- **Data export** — admin CSV download at `/api/export` with all players, demographics, and scores

---

## Admin endpoints

All admin endpoints require you to be logged in with your `ADMIN_EMAIL` account.

| Endpoint | Method | Description |
|---|---|---|
| `/api/export` | GET | Download CSV of all players, demographics, and total points |
| `/api/admin/reset` | POST | Delete all matches and predictions — use before switching data sources or resetting for a new tournament |
| `/api/admin/clear-events` | POST | Clear goals/bookings/statistics for all finished matches without touching predictions or match records — use to force a clean re-sync of event data |
| `/api/matches/sync` | POST | Sync match schedule and results from API-Sports; backfills goal/booking data for up to 3 recently finished matches per call |

---

## Sync strategy

Each sync uses:
- 1 API-Sports request for the full match list (scores + status)
- For recently finished matches missing events: up to 4 ESPN lookups (scoreboard by date → match summary). ESPN has no rate limits and requires no API key.

Hit Sync once after each match finishes to keep data fresh. The sync button shows a diagnostic line confirming whether event data was found.

---

## Tech stack

- **Framework** — Next.js 16 (App Router, Turbopack)
- **Database** — Neon Postgres via `@neondatabase/serverless` + Drizzle ORM
- **Auth** — bcryptjs + iron-session (cookie-based, 30-day sessions)
- **Football data** — API-Sports (fixtures + standings) + ESPN unofficial API (match events + statistics)
- **UI** — Tailwind CSS + shadcn/ui (@base-ui/react)
- **Hosting** — Vercel (free) + Neon (free, no pausing)
