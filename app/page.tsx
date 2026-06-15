export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { users, predictions } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getLeaderboard() {
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      totalPoints: sql<number>`coalesce(sum(${predictions.points}), 0)`.as('total_points'),
      predictionsCount: sql<number>`count(${predictions.id})`.as('predictions_count'),
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id, users.displayName)
    .orderBy(sql`total_points desc`);
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default async function HomePage() {
  const [leaderboard, user] = await Promise.all([getLeaderboard(), getCurrentUser()]);

  const top5 = leaderboard.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="text-center py-6 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">⚽ World Cup 2026 Picks</h1>
        <p className="text-muted-foreground">Predict match scores · Earn points · Win glory</p>
        {!user && (
          <div className="flex gap-3 justify-center pt-2">
            <Button render={<Link href="/signup" />}>Join the game</Button>
            <Button variant="outline" render={<Link href="/login" />}>Log in</Button>
          </div>
        )}
        {user && (
          <Button className="mt-2" render={<Link href="/matches" />}>View matches →</Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              🏆 Leaderboard
              <span className="text-sm font-normal text-muted-foreground">
                {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''}
              </span>
            </CardTitle>
            <Link href="/leaderboard" className="text-xs text-primary hover:underline">
              View full →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {top5.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">
              No players yet.{' '}
              <Link href="/signup" className="text-primary underline underline-offset-4">Be the first to join!</Link>
            </p>
          ) : (
            <div className="divide-y">
              {top5.map((player, i) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 py-3 ${player.id === user?.id ? 'font-semibold' : ''}`}
                >
                  <span className="w-8 text-center text-lg">
                    {i < 3 ? MEDALS[i] : <span className="text-muted-foreground text-sm">#{i + 1}</span>}
                  </span>
                  <span className="flex-1 truncate">{player.displayName}</span>
                  <Badge variant={i === 0 ? 'default' : 'secondary'} className="tabular-nums">
                    {player.totalPoints} pts
                  </Badge>
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {player.predictionsCount} pick{Number(player.predictionsCount) !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
              {leaderboard.length > 5 && (
                <div className="pt-3 text-center">
                  <Link href="/leaderboard" className="text-sm text-primary hover:underline">
                    See all {leaderboard.length} players →
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
