import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { lobbies, lobbyMembers } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/session';
import { generateLobbyCode } from '@/lib/lobby';
import { createLobbyUserLimiter, checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const MAX_LOBBIES_PER_HOST = 20;

const schema = z.object({
  name: z.string().min(2, 'Lobby name must be at least 2 characters').max(40),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateCheck = await checkRateLimit(createLobbyUserLimiter, String(session.userId));
  if (!rateCheck.success) return rateLimitResponse(rateCheck.reset);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(lobbyMembers)
    .where(and(eq(lobbyMembers.userId, session.userId), eq(lobbyMembers.isHost, true)));
  if (Number(count) >= MAX_LOBBIES_PER_HOST) {
    return NextResponse.json(
      { error: `You have reached the maximum number of lobbies you can create (${MAX_LOBBIES_PER_HOST})` },
      { status: 403 }
    );
  }

  const code = await generateLobbyCode();
  const [lobby] = await db.insert(lobbies).values({ name: parsed.data.name, code }).returning();
  await db.insert(lobbyMembers).values({ lobbyId: lobby.id, userId: session.userId, isHost: true });

  session.currentLobbyId = lobby.id;
  await session.save();

  return NextResponse.json({ ok: true, lobby: { id: lobby.id, name: lobby.name, code: lobby.code } });
}
