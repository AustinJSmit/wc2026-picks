# World Cup 2026

A World Cup 2026 prediction game. Players create accounts, predict match scores before kickoff, and earn points automatically when results come in.

**Scoring:**
- +1 point — correct winner (or draw)
- +1 point — exact correct scoreline
- Max 2 points per match · 104 matches total

**Live at:** [wc2026-picks-beta.vercel.app](https://wc2026-picks-beta.vercel.app)

---

## Deploy in ~5 minutes (free forever, no coding required)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AustinJSmit/wc2026-picks&env=DATABASE_URL,SESSION_SECRET&envDescription=DATABASE_URL%3A%20Your%20Neon%20connection%20string.%20SESSION_SECRET%3A%2032%2B%20random%20characters.)

### 1. Set up the database (Neon)

1. Go to [neon.tech](https://neon.tech) → create a free account
2. Create a new project
3. Copy the **Connection string** from the dashboard (looks like `postgresql://user:pass@host/db?sslmode=require`)

### 2. Deploy to Vercel

Click the **Deploy with Vercel** button above, or:

1. Fork this repo to your GitHub account
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your fork
3. In the **Environment Variables** section, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `SESSION_SECRET` | 32+ random characters (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

4. Click **Deploy**

No API key required — match data is fetched from the ESPN public API automatically.

### 3. Initialize your database

After your site deploys, visit:

```
https://your-app.vercel.app/setup
```

Click **Initialize Database**. That's it — no terminal, no commands.

### 4. Register and play

- Visit your site and click **Sign up**
- Create your own private **lobby** and get a shareable join code, or join a friend's lobby with their code
- Share the code (not just the URL) with friends — anyone who visits the site can create their own separate lobby with their own friends
- Match data loads automatically when anyone visits `/matches`

---

## Run locally

```bash
cp .env.example .env.local
# fill in DATABASE_URL and SESSION_SECRET in .env.local

npm install
npm run dev       # start at localhost:3000
```

Then visit `http://localhost:3000/setup` to initialize the database.

---

## Features

- **Email + password accounts** with optional demographic profile (age, gender, country, favorite team)
- **Timezone settings** — each user picks their timezone; kickoff times display locally everywhere
- **Match list** — live matches at top with pulsing indicator; upcoming (collapsible, make picks); past results (collapsible); all auto-sync from ESPN on page load
- **Match detail** — scoreline, goal scorers with minute + type (penalty/OG/header), yellow/red cards with player names, team statistics, lineup pitch visualization, group standings, and for knockout matches: each team's tournament history
- **Predictions lock at kickoff** — enforced server-side; friends' picks become visible after kickoff
- **Friends' picks** — after kickoff, see every player's prediction with team crests on the match page
- **Knockout bracket** (`/bracket`) — full 32-match bracket with connector lines, prediction badges, and Finals column centered between the Semifinals
- **Leaderboard** (`/leaderboard`) — unified table with gold/silver/bronze rank colors, correct result %, exact score count
- **Auto-scoring** — points award automatically when matches sync after full-time
- **Dark mode** — follows system default; toggle in nav dropdown (System / Light / Dark); FOUC-free
- **Live polling** — matches page syncs every time it loads; live matches refresh every 60 seconds automatically
- **Lineup pitch** — portrait pitch view with goal-net visuals at each end, available for upcoming, live, and finished matches
- **Private lobbies** (`/lobby`) — create your own group with a shareable 6-character join code, join others' lobbies with a code, and belong to multiple lobbies at once (e.g. one with college friends, one with family). Predictions and the leaderboard are scored separately per lobby; the underlying match schedule is shared by everyone.

---

## Host panel (admin features)

Whoever creates a lobby is its host. Access the host panel via the nav dropdown → **Host Panel** (only visible when you're the host of your currently selected lobby).

| Feature | Description |
|---|---|
| **Reset predictions** | Delete all picks in *your current lobby only* (keeps match data and other lobbies untouched). Useful for a re-do. |
| **Transfer host** | Hand control to another member of your current lobby. You are logged out immediately. |

---

## Data source

All match data comes from the **ESPN unofficial API** (no key required, no rate limits):

| Data | Endpoint |
|---|---|
| Fixtures + scores + status | `/scoreboard?dates=202606&limit=100` (June) + July |
| Goal scorers, cards, stats, lineups, venue | `/summary?event={espnId}` |
| Group standings | `/standings` |

Goal event types handled: `goal`, `goal---header`, `goal---volley`, `penalty---scored`, `own-goal`
Card event types handled: `yellow-card`, `red-card`, `var---red-card-upgrade`

---

## Admin API endpoints

These endpoints are also accessible via HTTP for power users:

| Endpoint | Method | Description |
|---|---|---|
| `/api/setup` | POST | Initialize or upgrade the database schema |
| `/api/matches/sync` | POST | Sync match schedule + scores from ESPN |
| `/api/lobbies` | POST | Create a new lobby and become its host |
| `/api/lobbies/join` | POST | Join a lobby by code |
| `/api/lobbies/switch` | POST | Switch your active lobby |
| `/api/export` | GET | Download CSV of your current lobby's players and points (host only) |
| `/api/admin/reset-predictions` | POST | Delete all predictions in your current lobby, keep matches (host only) |

---

## Tech stack

- **Framework** — Next.js 16 (App Router, Turbopack)
- **Database** — Neon Postgres via `@neondatabase/serverless` + Drizzle ORM
- **Auth** — bcryptjs + iron-session (cookie-based, 30-day sessions)
- **Football data** — ESPN unofficial API (no key required)
- **UI** — Tailwind CSS + shadcn/ui (@base-ui/react) + lucide-react
- **Hosting** — Vercel (free tier) + Neon (free tier, no pausing)
