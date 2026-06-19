export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { lobbies, lobbyMembers } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateLobbyForm, JoinLobbyForm, SwitchLobbyButton, CopyCodeButton, LobbyRowActions } from './lobby-actions';

export default async function LobbyPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const session = await getSession();

  const myLobbies = await db
    .select({
      id: lobbies.id,
      name: lobbies.name,
      code: lobbies.code,
      isHost: lobbyMembers.isHost,
      memberCount: sql<number>`(select count(*) from ${lobbyMembers} m where m.lobby_id = ${lobbies.id})`,
    })
    .from(lobbyMembers)
    .innerJoin(lobbies, eq(lobbies.id, lobbyMembers.lobbyId))
    .where(eq(lobbyMembers.userId, user.id))
    .orderBy(lobbies.name);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lobbies</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create your own private lobby or join one with a code from a friend.
        </p>
      </div>

      {myLobbies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your lobbies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myLobbies.map(lobby => (
              <div key={lobby.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{lobby.name}</span>
                    {lobby.isHost && (
                      <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold shrink-0">
                        Host
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Code: <span className="font-mono">{lobby.code}</span> · {lobby.memberCount} member{Number(lobby.memberCount) !== 1 ? 's' : ''}
                    </span>
                    <CopyCodeButton code={lobby.code} />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SwitchLobbyButton
                    lobbyId={lobby.id}
                    isCurrent={session.currentLobbyId === lobby.id}
                  />
                  <LobbyRowActions lobbyId={lobby.id} lobbyName={lobby.name} isHost={lobby.isHost} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <CreateLobbyForm />
      <JoinLobbyForm />
    </div>
  );
}
