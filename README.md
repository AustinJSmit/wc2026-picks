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

### 2. Get a football API key (football-data.org)

1. Register at [football-data.org/client/register](https://www.football-data.org/client/register)
2. Check your email for your free API key

### 3. Deploy to Vercel

1. Fork this repo to your GitHub account
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your fork
3. In the **Environment Variables** section, add:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `SESSION_SECRET` | 32+ random characters (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `FOOTBALL_API_KEY` | Your football-data.org key |
| `ADMIN_EMAIL` | Your email (grants access to the data export) |

4. Click **Deploy** — done!

### 4. Set up the database schema

After first deploy, run the migration once from your local machine:

```bash
npm install
DATABASE_URL="your-neon-connection-string" npm run db:push
```

### 5. Load the match schedule

Log in to the app, go to **Matches**, and click **🔄 Sync results**. This loads all World Cup 2026 matches from the football API.

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
- **Leaderboard** — live standings across all players, visible to anyone
- **Match schedule** — upcoming (predict) and past (results + your points)
- **Predictions lock at kickoff** — enforced on the server, not just the UI
- **Voice input** — say "two one" or "Japan 2 Netherlands 1" on Chrome/Safari mobile
- **Auto-scoring** — hit Sync after matches finish; points award automatically
- **Data export** — admin CSV download at `/api/export` with all players, demographics, and scores

---

## Data export

Visit `/api/export` while logged in with your `ADMIN_EMAIL` account to download a CSV of all players with their demographic info and total points — useful for post-tournament analysis in Excel, Python, etc.
