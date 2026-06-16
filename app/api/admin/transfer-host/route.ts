import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, lobbyMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentLobby } from '@/lib/lobby';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const lobby = await getCurrentLobby();
  if (!user || !lobby?.isHost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { toUserId } = await req.json();
  if (!toUserId || toUserId === user.id) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  const [targetMembership] = await db
    .select({ userId: lobbyMembers.userId, displayName: users.displayName })
    .from(lobbyMembers)
    .innerJoin(users, eq(users.id, lobbyMembers.userId))
    .where(and(eq(lobbyMembers.lobbyId, lobby.id), eq(lobbyMembers.userId, toUserId)));
  if (!targetMembership) {
    return NextResponse.json({ error: 'User not found in this lobby' }, { status: 404 });
  }

  await db
    .update(lobbyMembers)
    .set({ isHost: false })
    .where(and(eq(lobbyMembers.lobbyId, lobby.id), eq(lobbyMembers.userId, user.id)));
  await db
    .update(lobbyMembers)
    .set({ isHost: true })
    .where(and(eq(lobbyMembers.lobbyId, lobby.id), eq(lobbyMembers.userId, toUserId)));

  return NextResponse.json({ ok: true, newHost: targetMembership.displayName });
}
