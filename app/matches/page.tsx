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
import LivePoller from './live-poller';
import { getFifaRank } from '@/lib/fifa-rankings';

function formatKickoff(date: Date, tz?: string | null) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short',
    ...(tz ? { timeZone: tz } : {}),
  }).format(date);
}

function MatchRow({ match, pred, tz }: {
  match: typeof matches.$inferSelect;
  pred: typeof predictions.$inferSelect | undefined;
  tz: string | null;
}) {
  const finished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';

  return (
    <Link href={`/match/${match.id}`} className="block">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium flex flex-wrap items-baseline gap-x-1">
              {match.homeTeamCrest && <img src={match.homeTeamCrest} alt="" className="h-4 w-4 object-contain inline-block" />}
              {match.homeTeam}
              <span className="text-xs text-muted-foreground font-normal">#{getFifaRank(match.homeTeam) ?? '–'}</span>
              <span className="text-muted-foreground text-sm font-normal">vs</span>
              {match.awayTeamCrest && <img src={match.awayTeamCrest} alt="" className="h-4 w-4 object-contain inline-block" />}
              {match.awayTeam}
              <span className="text-xs text-muted-foreground font-normal">#{getFifaRank(match.awayTeam) ?? '–'}</span>
            </div>
            {finished && match.homeScore != null && (
              <div className="text-sm font-bold text-foreground mt-0.5">
                Result: {match.homeScore}–{match.awayScore}
              </div>
            )}
            {isLive && match.homeScore != null && (
              <div className="text-sm font-bold text-green-600 mt-0.5">
                {match.homeScore}–{match.awayScore}
              </div>
            )}
            {!finished && !isLive && (
              <div className="text-xs text-muted-foreground mt-0.5">{formatKickoff(new Date(match.kickoffAt), tz)}</div>
            )}
          </div>
          <div className="text-right shrink-0">
            {pred ? (
              <div>
                <div className="text-xs text-muted-foreground">Pick: {pred.predHome}–{pred.predAway}</div>
                {pred.points != null && (
                  <Badge variant={pred.points > 0 ? 'default' : 'secondary'} className="mt-1">
                    {pred.points} pt{pred.points !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            ) : (
              <Badge variant="outline" className="border-primary text-primary text-xs">
                Pick →
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
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

  const live = allMatches.filter(m => m.status === 'LIVE');
  const upcoming = allMatches.filter(m => new Date(m.kickoffAt) > now && m.status !== 'LIVE');
  const past = allMatches.filter(m => new Date(m.kickoffAt) <= now && m.status !== 'LIVE').reverse();

  return (
    <div className="space-y-6">
      <LivePoller hasLive={live.length > 0} />

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

      {/* Live Now section — shown first when any match is live */}
      {live.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-red-600 dark:text-red-400">Live Now</span>
          </h2>
          <div className="space-y-2">
            {live.map(match => (
              <MatchRow key={match.id} match={match} pred={predByMatch[match.id]} tz={user.timezone} />
            ))}
          </div>
        </section>
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
                        <div className="font-medium flex flex-wrap items-baseline gap-x-1">
                          {match.homeTeamCrest && <img src={match.homeTeamCrest} alt="" className="h-4 w-4 object-contain inline-block" />}
                          {match.homeTeam}
                          <span className="text-xs text-muted-foreground font-normal">#{getFifaRank(match.homeTeam) ?? '–'}</span>
                          <span className="text-muted-foreground text-sm font-normal">vs</span>
                          {match.awayTeamCrest && <img src={match.awayTeamCrest} alt="" className="h-4 w-4 object-contain inline-block" />}
                          {match.awayTeam}
                          <span className="text-xs text-muted-foreground font-normal">#{getFifaRank(match.awayTeam) ?? '–'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{formatKickoff(new Date(match.kickoffAt), user.timezone)}</div>
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
            {past.map(match => (
              <MatchRow key={match.id} match={match} pred={predByMatch[match.id]} tz={user.timezone} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
