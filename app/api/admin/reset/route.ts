import { NextResponse } from 'next/server';
import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { getSession } from '@/lib/session';

export async function POST() {
  const session = await getSession();
  if (!session.email || session.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete predictions first (FK references matches)
  const deletedPredictions = await db.delete(predictions).returning({ id: predictions.id });
  const deletedMatches = await db.delete(matches).returning({ id: matches.id });

  return NextResponse.json({
    ok: true,
    deletedPredictions: deletedPredictions.length,
    deletedMatches: deletedMatches.length,
  });
}
