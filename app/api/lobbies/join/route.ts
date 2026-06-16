import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { lobbies, lobbyMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';

const schema = z.object({
  code: z.string().min(1, 'Enter a lobby code'),
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

  const code = parsed.data.code.trim().toUpperCase();
  const [lobby] = await db.select().from(lobbies).where(eq(lobbies.code, code));
  if (!lobby) {
    return NextResponse.json({ error: 'No lobby found with that code' }, { status: 404 });
  }

  const [existingMembership] = await db
    .select()
    .from(lobbyMembers)
    .where(and(eq(lobbyMembers.lobbyId, lobby.id), eq(lobbyMembers.userId, session.userId)));

  if (!existingMembership) {
    await db.insert(lobbyMembers).values({ lobbyId: lobby.id, userId: session.userId, isHost: false });
  }

  session.currentLobbyId = lobby.id;
  await session.save();

  return NextResponse.json({ ok: true, lobby: { id: lobby.id, name: lobby.name, code: lobby.code } });
}
