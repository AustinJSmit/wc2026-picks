export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { users, predictions, matches, lobbyMembers } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentLobby } from '@/lib/lobby';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function getLobbyMembers(lobbyId: number) {
  return db
    .select({ id: users.id, displayName: users.displayName })
    .from(lobbyMembers)
    .innerJoin(users, eq(users.id, lobbyMembers.userId))
    .where(eq(lobbyMembers.lobbyId, lobbyId));
}

async function getPredictionHistory(userId: number, lobbyId: number) {
  return db
    .select({
      matchId: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      kickoffAt: matches.kickoffAt,
      predHome: predictions.predHome,
      predAway: predictions.predAway,
      points: predictions.points,
    })
    .from(predictions)
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .where(and(eq(predictions.userId, userId), eq(predictions.lobbyId, lobbyId)))
    .orderBy(desc(matches.kickoffAt));
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const lobby = await getCurrentLobby();
  if (!lobby) redirect('/lobby');
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const params = await searchParams;
  const requestedId = params.userId ? parseInt(params.userId) : currentUser.id;

  const members = await getLobbyMembers(lobby.id);
  const isValidMember = members.some(m => m.id === requestedId);
  const targetUserId = isValidMember ? requestedId : currentUser.id;
  const targetUser = members.find(m => m.id === targetUserId)!;

  const history = await getPredictionHistory(targetUserId, lobby.id);

  const totalPts = history.reduce((sum, p) => sum + (p.points ?? 0), 0);
  const correct = history.filter(p => (p.points ?? 0) >= 1).length;
  const exact = history.filter(p => p.points === 2).length;
  const completed = history.filter(p => p.points != null).length;
  const teamRate = completed > 0 ? Math.round((correct / completed) * 100) : null;

  const isViewingOwn = targetUserId === currentUser.id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Pick History</h1>

      {/* Player switcher */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {members.map(member => {
          const isActive = member.id === targetUserId;
          const label = member.id === currentUser.id ? 'Me' : member.displayName;
          return (
            <Link
              key={member.id}
              href={`/history?userId=${member.id}`}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Pts', value: totalPts },
          { label: 'Team %', value: teamRate != null ? `${teamRate}%` : '—' },
          { label: 'Correct (1pt)', value: correct },
          { label: 'Exact (2pts)', value: exact },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="py-4 text-center">
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* History table */}
      {history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isViewingOwn ? 'You haven\'t made any picks yet.' : `${targetUser.displayName} hasn't made any picks yet.`}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
              {isViewingOwn ? 'Your Picks' : `${targetUser.displayName}'s Picks`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 px-0">
            <div
              className="grid text-[10px] text-muted-foreground px-4 py-1 border-b"
              style={{ gridTemplateColumns: '52px 1fr 56px 56px 32px' }}
            >
              <span>Date</span>
              <span>Match</span>
              <span className="text-center">Pick</span>
              <span className="text-center">Result</span>
              <span className="text-center">Pts</span>
            </div>
            <div className="divide-y">
              {history.map(row => {
                const finished = row.status === 'FINISHED';
                const ptColor =
                  row.points === 2 ? 'text-green-500 font-bold' :
                  row.points === 1 ? 'text-blue-500 font-semibold' :
                  'text-muted-foreground';

                return (
                  <div
                    key={row.matchId}
                    className="grid items-center px-4 py-2.5 text-sm"
                    style={{ gridTemplateColumns: '52px 1fr 56px 56px 32px' }}
                  >
                    <span className="text-xs text-muted-foreground">
                      {formatDate(new Date(row.kickoffAt))}
                    </span>
                    <span className="truncate text-xs">
                      {row.homeTeam} vs {row.awayTeam}
                    </span>
                    <span className="text-center text-xs tabular-nums">
                      {row.predHome}–{row.predAway}
                    </span>
                    <span className="text-center text-xs tabular-nums text-muted-foreground">
                      {finished && row.homeScore != null ? `${row.homeScore}–${row.awayScore}` : '—'}
                    </span>
                    <span className={`text-center text-xs ${ptColor}`}>
                      {row.points != null ? row.points : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
