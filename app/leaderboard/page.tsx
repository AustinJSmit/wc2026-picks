export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { users, predictions } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
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

function rankColor(i: number) {
  if (i === 0) return 'text-yellow-500 font-semibold';
  if (i === 1) return 'text-slate-400 font-semibold';
  if (i === 2) return 'text-amber-600 font-semibold';
  return 'text-muted-foreground';
}

export default async function LeaderboardPage() {
  const [leaderboard, user] = await Promise.all([getLeaderboard(), getCurrentUser()]);

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
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Rankings</CardTitle>
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
              {leaderboard.map((player, i) => {
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
                    <span className={`text-xs ${rankColor(i)}`}>#{i + 1}</span>
                    <span className={`truncate ${isMe ? 'text-primary' : ''}`}>
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
    </div>
  );
}
