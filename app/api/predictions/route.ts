import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/session';

const schema = z.object({
  matchId: z.number().int().positive(),
  predHome: z.number().int().min(0).max(99),
  predAway: z.number().int().min(0).max(99),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
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
    .values({ userId: session.userId, matchId, predHome, predAway })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.matchId],
      set: { predHome, predAway, submittedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
