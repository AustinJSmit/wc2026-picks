export const dynamic = 'force-dynamic';

import { getCurrentUser } from '@/lib/auth';
import { getCurrentLobby } from '@/lib/lobby';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, predictions, lobbyMembers } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import AdminPanels from './admin-panels';

export default async function AdminPage() {
  const user = await getCurrentUser();
  const lobby = await getCurrentLobby();
  if (!user || !lobby?.isHost) redirect('/matches');

  const [predCountResult, lobbyUsers] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(predictions).where(eq(predictions.lobbyId, lobby.id)),
    db
      .select({ id: users.id, displayName: users.displayName })
      .from(lobbyMembers)
      .innerJoin(users, eq(users.id, lobbyMembers.userId))
      .where(eq(lobbyMembers.lobbyId, lobby.id))
      .orderBy(users.displayName),
  ]);

  const predictionCount = Number(predCountResult[0]?.n ?? 0);
  const playerCount = lobbyUsers.length;
  const currentUserId = user.id;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Host Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage <strong>{lobby.name}</strong> — resets and host transfer for this lobby.
        </p>
      </div>
      <AdminPanels
        predictionCount={predictionCount}
        playerCount={playerCount}
        allUsers={lobbyUsers}
        currentUserId={currentUserId}
      />
    </div>
  );
}
