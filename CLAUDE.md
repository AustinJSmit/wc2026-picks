# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # dev server at localhost:3000 (Turbopack)
npm run build        # production build
npm run lint         # ESLint
npm run db:push      # push schema to Neon (no migration files — direct push only)
npm run db:studio    # Drizzle Studio GUI
```

## Architecture

**Route protection:** `proxy.ts` — Next.js 16 renamed `middleware.ts` to `proxy.ts`; the exported function must be named `proxy`, not `middleware`.

**Auth:** `lib/auth.ts` (bcrypt password hashing) + `lib/session.ts` (iron-session, 30-day cookie). Session holds `userId`, `lobbyId`, `isAdmin`.

**Database:** `db/schema.ts` defines all tables; `db/index.ts` holds the Neon serverless connection. Schema is managed with `db:push` — there are no migration files. All server pages that query the DB need `export const dynamic = 'force-dynamic'`.

**Lobbies:** Each lobby has independent predictions and a separate leaderboard. `lib/lobby.ts` generates 6-char join codes. Users can belong to multiple lobbies; `session.lobbyId` tracks the active one.

**Match data:** `lib/football-api.ts` wraps the ESPN unofficial API (no key required). Synced server-side via `app/api/matches/sync/route.ts` — called automatically on `/matches` page load with a 20-second cooldown to prevent stampedes.

**Scoring:** `lib/scoring.ts` — `calculatePoints()` awards +1 for correct winner/draw, +1 for exact scoreline.

**Rate limiting:** `lib/rateLimit.ts` — Upstash Redis via `Redis.fromEnv()`. Gracefully skipped with a console warning if `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are absent.

**CAPTCHA:** `lib/turnstile.ts` — Cloudflare Turnstile on signup. Gracefully skipped if `TURNSTILE_SECRET_KEY` is absent.

**UI components:** shadcn/ui is built on `@base-ui/react`. Use the `render` prop instead of `asChild` for polymorphic buttons — `asChild` does not exist in this version.
