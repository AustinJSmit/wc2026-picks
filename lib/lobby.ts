import { getSession } from './session';
import { db } from '@/db';
import { lobbies, lobbyMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes 0/O/1/I

export function generateLobbyCodeCandidate() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function generateLobbyCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateLobbyCodeCandidate();
    const [existing] = await db.select({ id: lobbies.id }).from(lobbies).where(eq(lobbies.code, code));
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique lobby code');
}

export async function getCurrentLobby() {
  const session = await getSession();
  if (!session.userId || !session.currentLobbyId) return null;

  const [row] = await db
    .select({
      id: lobbies.id,
      name: lobbies.name,
      code: lobbies.code,
      isHost: lobbyMembers.isHost,
    })
    .from(lobbyMembers)
    .innerJoin(lobbies, eq(lobbies.id, lobbyMembers.lobbyId))
    .where(and(eq(lobbyMembers.userId, session.userId), eq(lobbyMembers.lobbyId, session.currentLobbyId)));

  return row ?? null;
}
