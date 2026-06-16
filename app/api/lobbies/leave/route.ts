import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { lobbyMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';

const schema = z.object({
  lobbyId: z.number(),
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

  const { lobbyId } = parsed.data;

  const [membership] = await db
    .select()
    .from(lobbyMembers)
    .where(and(eq(lobbyMembers.lobbyId, lobbyId), eq(lobbyMembers.userId, session.userId)));

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this lobby' }, { status: 404 });
  }
  if (membership.isHost) {
    return NextResponse.json({ error: 'Transfer host or delete the lobby instead of leaving' }, { status: 400 });
  }

  await db
    .delete(lobbyMembers)
    .where(and(eq(lobbyMembers.lobbyId, lobbyId), eq(lobbyMembers.userId, session.userId)));

  if (session.currentLobbyId === lobbyId) {
    session.currentLobbyId = undefined;
    await session.save();
  }

  return NextResponse.json({ ok: true });
}
