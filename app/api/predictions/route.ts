import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { matches, predictions, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { getCurrentLobby } from '@/lib/lobby';

const postSchema = z.object({
  matchId: z.number().int().positive(),
  predHome: z.number().int().min(0).max(99),
  predAway: z.number().int().min(0).max(99),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const lobby = await getCurrentLobby();
  if (!lobby) return NextResponse.json({ error: 'No active lobby' }, { status: 400 });

  const matchId = parseInt(req.nextUrl.searchParams.get('matchId') ?? '', 10);
  if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 });

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  // Only reveal predictions after kickoff (predictions are locked)
  if (new Date() < match.kickoffAt) {
    return NextResponse.json([]);
  }

  const rows = await db
    .select({
      displayName: users.displayName,
      predHome: predictions.predHome,
      predAway: predictions.predAway,
      points: predictions.points,
    })
    .from(predictions)
    .innerJoin(users, eq(users.id, predictions.userId))
    .where(and(eq(predictions.matchId, matchId), eq(predictions.lobbyId, lobby.id)))
    .orderBy(users.displayName);

  return NextResponse.json(
    rows.map(r => ({
      ...r,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeTeamCrest: match.homeTeamCrest,
      awayTeamCrest: match.awayTeamCrest,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const lobby = await getCurrentLobby();
  if (!lobby) {
    return NextResponse.json({ error: 'No active lobby' }, { status: 400 });
  }

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { matchId, predHome, predAway } = parsed.data;

  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (new Date() >= match.kickoffAt) {
    return NextResponse.json({ error: 'Predictions are locked — this match has already started' }, { status: 409 });
  }

  await db
    .insert(predictions)
    .values({ lobbyId: lobby.id, userId: session.userId, matchId, predHome, predAway })
    .onConflictDoUpdate({
      target: [predictions.lobbyId, predictions.userId, predictions.matchId],
      set: { predHome, predAway, submittedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
