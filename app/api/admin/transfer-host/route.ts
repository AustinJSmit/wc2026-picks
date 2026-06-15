import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { toUserId } = await req.json();
  if (!toUserId || toUserId === user.id) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  const [target] = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, toUserId));
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await db.update(users).set({ isAdmin: false }).where(eq(users.id, user.id));
  await db.update(users).set({ isAdmin: true }).where(eq(users.id, toUserId));

  return NextResponse.json({ ok: true, newHost: target.displayName });
}
