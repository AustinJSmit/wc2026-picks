import { NextResponse } from 'next/server';
import { db } from '@/db';
import { predictions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentLobby } from '@/lib/lobby';

export async function POST() {
  const lobby = await getCurrentLobby();
  if (!lobby?.isHost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const deleted = await db
    .delete(predictions)
    .where(eq(predictions.lobbyId, lobby.id))
    .returning({ id: predictions.id });

  return NextResponse.json({ ok: true, deleted: deleted.length });
}
