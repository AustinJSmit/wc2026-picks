import { NextResponse } from 'next/server';
import { db } from '@/db';
import { matches } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await db
    .update(matches)
    .set({ goals: null, bookings: null, statistics: null })
    .where(eq(matches.status, 'FINISHED'))
    .returning({ id: matches.id });

  return NextResponse.json({ ok: true, matchesCleared: updated.length });
}
