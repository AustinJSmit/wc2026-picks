export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { users, predictions } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

async function getLeaderboard() {
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      favoriteTeam: users.favoriteTeam,
      totalPoints: sql<number>`coalesce(sum(${predictions.points}), 0)`.as('total_points'),
      totalPicks: sql<number>`count(${predictions.id})`.as('total_picks'),
      exactScores: sql<number>`count(case when ${predictions.points} = 2 then 1 end)`.as('exact_scores'),
      correctResults: sql<number>`count(case when ${predictions.points} >= 1 then 1 end)`.as('correct_results'),
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id, users.displayName, users.favoriteTeam)
    .orderBy(sql`total_points desc nulls last`);
}

const MEDALS = ['🥇', '🥈', '🥉'];
const PODIUM_COLORS = [
  'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30',
  'border-zinc-400 bg-zinc-50 dark:bg-zinc-800/40',
  'border-amber-600 bg-amber-50 dark:bg-amber-950/30',
];

export default async function LeaderboardPage() {
  const [leaderboard, user] = await Promise.all([getLeaderboard(), getCurrentUser()]);

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      {leaderboard.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No predictions submitted yet.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Podium top-3 */}
          <div className="space-y-3">
            {podium.map((player, i) => {
              const picks = Number(player.totalPicks);
              const correct = Number(player.correctResults);
              const exact = Number(player.exactScores);
              const accuracy = picks > 0 ? Math.round((correct / picks) * 100) : 0;
              const isMe = player.id === user?.id;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-4 rounded-xl border-2 px-4 py-3 ${PODIUM_COLORS[i]} ${isMe ? 'ring-2 ring-primary' : ''}`}
                >
                  <span className="text-3xl w-10 text-center shrink-0">{MEDALS[i]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate text-base ${isMe ? 'text-primary' : ''}`}>
                      {player.displayName}{isMe ? ' (you)' : ''}
                    </p>
                    {player.favoriteTeam && (
                      <p className="text-xs text-muted-foreground truncate">❤️ {player.favoriteTeam}</p>
                    )}
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{picks} pick{picks !== 1 ? 's' : ''}</span>
                      <span>{accuracy}% correct</span>
                      <span>{exact} exact</span>
                    </div>
                  </div>
                  <Badge variant={i === 0 ? 'default' : 'secondary'} className="text-lg px-3 py-1 shrink-0 tabular-nums">
                    {player.totalPoints} pts
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Rest of table */}
          {rest.length > 0 && (
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Remaining Rankings</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div
                  className="grid text-[10px] text-muted-foreground px-2 py-1 border-b"
                  style={{ gridTemplateColumns: '28px 1fr 44px 52px 40px 36px' }}
                >
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-center">Picks</span>
                  <span className="text-center">Correct%</span>
                  <span className="text-center">Exact</span>
                  <span className="text-center font-semibold">Pts</span>
                </div>
                <div className="divide-y">
                  {rest.map((player, i) => {
                    const picks = Number(player.totalPicks);
                    const correct = Number(player.correctResults);
                    const exact = Number(player.exactScores);
                    const accuracy = picks > 0 ? Math.round((correct / picks) * 100) : 0;
                    const isMe = player.id === user?.id;

                    return (
                      <div
                        key={player.id}
                        className={`grid items-center px-2 py-2.5 text-sm ${isMe ? 'bg-primary/5 font-semibold' : ''}`}
                        style={{ gridTemplateColumns: '28px 1fr 44px 52px 40px 36px' }}
                      >
                        <span className="text-muted-foreground text-xs">#{i + 4}</span>
                        <span className="truncate">
                          {player.displayName}{isMe ? ' ✦' : ''}
                        </span>
                        <span className="text-center text-xs text-muted-foreground">{picks}</span>
                        <span className="text-center text-xs text-muted-foreground">{accuracy}%</span>
                        <span className="text-center text-xs text-muted-foreground">{exact}</span>
                        <span className="text-center font-bold">{player.totalPoints}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
