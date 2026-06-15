import { NextResponse } from 'next/server';
import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
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
