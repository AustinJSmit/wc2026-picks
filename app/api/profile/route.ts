import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';

const schema = z.object({
  displayName: z.string().min(2).max(30).optional(),
  age: z.number().int().min(5).max(120).nullable().optional(),
  gender: z.string().nullable().optional(),
  country: z.string().max(60).nullable().optional(),
  favoriteTeam: z.string().max(60).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.displayName !== undefined) updates.displayName = d.displayName;
  if (d.age !== undefined) updates.age = d.age;
  if (d.gender !== undefined) updates.gender = d.gender;
  if (d.country !== undefined) updates.country = d.country;
  if (d.favoriteTeam !== undefined) updates.favoriteTeam = d.favoriteTeam;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await db.update(users).set(updates).where(eq(users.id, session.userId));

  if (d.displayName) {
    session.displayName = d.displayName;
    await session.save();
  }

  return NextResponse.json({ ok: true });
}
