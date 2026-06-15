export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import SyncButton from './sync-button';

function formatKickoff(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export default async function MatchesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const allMatches = await db.select().from(matches).orderBy(matches.kickoffAt);

  const userPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, user.id));

  const predByMatch = Object.fromEntries(userPredictions.map(p => [p.matchId, p]));
  const now = new Date();

  const upcoming = allMatches.filter(m => new Date(m.kickoffAt) > now);
  const past = allMatches.filter(m => new Date(m.kickoffAt) <= now).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Matches</h1>
        <SyncButton />
      </div>

      {allMatches.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No matches loaded yet. Hit <strong>Sync</strong> to fetch the World Cup 2026 schedule.
          </CardContent>
        </Card>
      )}

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-primary">Upcoming — make your picks</h2>
          <div className="space-y-2">
            {upcoming.map(match => {
              const pred = predByMatch[match.id];
              return (
                <Link key={match.id} href={`/match/${match.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="py-3 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="font-medium">
                          {match.homeTeam} <span className="text-muted-foreground text-sm">vs</span> {match.awayTeam}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{formatKickoff(new Date(match.kickoffAt))}</div>
                      </div>
                      {pred ? (
                        <Badge variant="secondary" className="shrink-0">
                          {pred.predHome}–{pred.predAway} ✓
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0 border-primary text-primary">
                          Pick →
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Past matches</h2>
          <div className="space-y-2">
            {past.map(match => {
              const pred = predByMatch[match.id];
              const finished = match.status === 'FINISHED';
              return (
                <Card key={match.id} className="opacity-80">
                  <CardContent className="py-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="font-medium">
                        {match.homeTeam} <span className="text-muted-foreground text-sm">vs</span> {match.awayTeam}
                      </div>
                      {finished && match.homeScore != null && (
                        <div className="text-sm font-bold text-foreground mt-0.5">
                          Result: {match.homeScore}–{match.awayScore}
                        </div>
                      )}
                      {match.status === 'LIVE' && (
                        <div className="text-xs font-semibold text-green-600 mt-0.5">🔴 LIVE</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {pred ? (
                        <div>
                          <div className="text-xs text-muted-foreground">Your pick: {pred.predHome}–{pred.predAway}</div>
                          {pred.points != null && (
                            <Badge variant={pred.points > 0 ? 'default' : 'secondary'} className="mt-1">
                              {pred.points} pt{pred.points !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No pick</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
