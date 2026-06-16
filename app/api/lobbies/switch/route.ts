import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { lobbyMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';

const schema = z.object({
  lobbyId: z.number().int().positive(),
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

  const [membership] = await db
    .select()
    .from(lobbyMembers)
    .where(and(eq(lobbyMembers.lobbyId, parsed.data.lobbyId), eq(lobbyMembers.userId, session.userId)));

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of that lobby' }, { status: 403 });
  }

  session.currentLobbyId = parsed.data.lobbyId;
  await session.save();

  return NextResponse.json({ ok: true });
}
