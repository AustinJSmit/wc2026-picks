import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL is not configured' }, { status: 500 });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);

    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        country TEXT,
        favorite_team TEXT,
        timezone TEXT,
        dark_mode TEXT,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`;

    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        api_id TEXT UNIQUE,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        kickoff_at TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        home_score INTEGER,
        away_score INTEGER,
        stage TEXT,
        home_team_crest TEXT,
        away_team_crest TEXT,
        goals JSONB,
        bookings JSONB,
        statistics JSONB,
        lineups JSONB,
        venue TEXT,
        attendance INTEGER
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS lobbies (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS lobby_members (
        id SERIAL PRIMARY KEY,
        lobby_id INTEGER NOT NULL REFERENCES lobbies(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        is_host BOOLEAN NOT NULL DEFAULT FALSE,
        joined_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(lobby_id, user_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        lobby_id INTEGER NOT NULL REFERENCES lobbies(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        match_id INTEGER NOT NULL REFERENCES matches(id),
        pred_home INTEGER NOT NULL,
        pred_away INTEGER NOT NULL,
        points INTEGER,
        submitted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(lobby_id, user_id, match_id)
      )
    `;

    await sql`ALTER TABLE predictions ADD COLUMN IF NOT EXISTS lobby_id INTEGER REFERENCES lobbies(id)`;

    return NextResponse.json({ ok: true, message: 'Database ready' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
