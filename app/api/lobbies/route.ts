import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { lobbies, lobbyMembers } from '@/db/schema';
import { getSession } from '@/lib/session';
import { generateLobbyCode } from '@/lib/lobby';

const schema = z.object({
  name: z.string().min(2, 'Lobby name must be at least 2 characters').max(40),
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

  const code = await generateLobbyCode();
  const [lobby] = await db.insert(lobbies).values({ name: parsed.data.name, code }).returning();
  await db.insert(lobbyMembers).values({ lobbyId: lobby.id, userId: session.userId, isHost: true });

  session.currentLobbyId = lobby.id;
  await session.save();

  return NextResponse.json({ ok: true, lobby: { id: lobby.id, name: lobby.name, code: lobby.code } });
}
