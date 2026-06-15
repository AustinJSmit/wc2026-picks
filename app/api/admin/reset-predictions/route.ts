import { NextResponse } from 'next/server';
import { db } from '@/db';
import { predictions } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const deleted = await db.delete(predictions).returning({ id: predictions.id });
  return NextResponse.json({ ok: true, deleted: deleted.length });
}
