export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PredictionForm from './prediction-form';
import MatchEvents from '@/components/match-events';
import { getFifaRank } from '@/lib/fifa-rankings';
import type { ApiGoal, ApiBooking, ApiTeamStats } from '@/lib/football-api';

function formatKickoff(date: Date, tz?: string | null) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    ...(tz ? { timeZone: tz } : {}),
  }).format(date);
}

function MatchStats({ homeTeam, awayTeam, goals, bookings }: {
  homeTeam: string; awayTeam: string;
  goals: ApiGoal[] | null; bookings: ApiBooking[] | null;
}) {
  if (!goals && !bookings) return null;

  const g = goals ?? [];
  const b = bookings ?? [];
  const norm = (s: string) => s.trim().toLowerCase();

  const homeGoals = g.filter(x => norm(x.team.name) === norm(homeTeam));
  const awayGoals = g.filter(x => norm(x.team.name) === norm(awayTeam));
  const homeBookings = b.filter(x => norm(x.team.name) === norm(homeTeam));
  const awayBookings = b.filter(x => norm(x.team.name) === norm(awayTeam));
  const goalsMatched = homeGoals.length + awayGoals.length > 0;

  const scorerLine = (goal: ApiGoal) =>
    `${goal.scorer.name} ${goal.minute}'${goal.injuryTime ? `+${goal.injuryTime}` : ''}${goal.type === 'OWN_GOAL' ? ' (OG)' : goal.type === 'PENALTY' ? ' (P)' : ''}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Match Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {g.length > 0 && (
          goalsMatched ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-0.5">
                {homeGoals.map((goal, i) => <p key={i} className="text-xs">⚽ {scorerLine(goal)}</p>)}
              </div>
              <div className="space-y-0.5 text-right">
                {awayGoals.map((goal, i) => <p key={i} className="text-xs">⚽ {scorerLine(goal)}</p>)}
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {[...g].sort((a, b) => a.minute - b.minute).map((goal, i) => (
                <p key={i} className="text-xs">⚽ {scorerLine(goal)} ({goal.team.name})</p>
              ))}
            </div>
          )
        )}
        {b.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
            <div className="space-y-0.5">
              {homeBookings.map((bk, i) => (
                <p key={i} className="text-xs">
                  {bk.card === 'RED_CARD' ? '🟥' : '🟨'} {bk.player.name} {bk.minute}&apos;
                </p>
              ))}
            </div>
            <div className="space-y-0.5 text-right">
              {awayBookings.map((bk, i) => (
                <p key={i} className="text-xs">
                  {bk.card === 'RED_CARD' ? '🟥' : '🟨'} {bk.player.name} {bk.minute}&apos;
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatchStatisticsCard({ homeTeam, awayTeam, statistics }: {
  homeTeam: string; awayTeam: string;
  statistics: [ApiTeamStats, ApiTeamStats] | null;
}) {
  if (!statistics) return null;
  const norm = (s: string) => s.trim().toLowerCase();
  const home = statistics.find(s => norm(s.team.name) === norm(homeTeam)) ?? statistics[0];
  const away = statistics.find(s => norm(s.team.name) !== norm(homeTeam)) ?? statistics[1];

  const rows = [
    { label: 'Possession', h: home.possession, a: away.possession },
    { label: 'Shots', h: home.totalShots, a: away.totalShots },
    { label: 'Shots on Target', h: home.shotsOnGoal, a: away.shotsOnGoal },
    { label: 'Saves', h: home.saves, a: away.saves },
    { label: 'Corners', h: home.corners, a: away.corners },
    { label: 'Fouls', h: home.fouls, a: away.fouls },
    { label: 'Offsides', h: home.offsides, a: away.offsides },
    { label: 'Passes', h: home.totalPasses, a: away.totalPasses },
    { label: 'Pass Accuracy', h: home.passAccuracy, a: away.passAccuracy },
  ].filter(r => r.h != null || r.a != null);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Match Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {rows.map(row => (
            <div key={row.label} className="grid grid-cols-3 items-center text-sm">
              <span className="text-right pr-3 font-mono tabular-nums">{row.h ?? '—'}</span>
              <span className="text-center text-xs text-muted-foreground">{row.label}</span>
              <span className="pl-3 font-mono tabular-nums">{row.a ?? '—'}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamHeader({ name, crest, rank }: { name: string; crest: string | null; rank: number | null }) {
  return (
    <span className="inline-flex flex-col items-center gap-1">
      {crest && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={crest} alt={name} className="h-10 w-10 object-contain" />
      )}
      <span className="font-bold">{name}</span>
      {rank && <span className="text-xs text-muted-foreground font-normal">FIFA #{rank}</span>}
    </span>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [match] = await db.select().from(matches).where(eq(matches.id, Number(id)));
  if (!match) notFound();

  const [existingPred] = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.userId, user.id), eq(predictions.matchId, match.id)));

  const isLocked = new Date() >= match.kickoffAt;
  const isFinished = match.status === 'FINISHED';

  const stageLabel = match.stage
    ? match.stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-2">
        {stageLabel && (
          <Badge variant="outline" className="text-xs">{stageLabel}</Badge>
        )}
        <p className="text-sm text-muted-foreground">{formatKickoff(new Date(match.kickoffAt), user.timezone)}</p>

        <div className="flex items-center justify-center gap-4 py-2">
          <TeamHeader
            name={match.homeTeam}
            crest={match.homeTeamCrest ?? null}
            rank={getFifaRank(match.homeTeam)}
          />
          <div className="text-center">
            {isFinished && match.homeScore != null ? (
              <div className="text-3xl font-bold tabular-nums">
                {match.homeScore} – {match.awayScore}
              </div>
            ) : (
              <span className="text-muted-foreground font-normal text-lg">vs</span>
            )}
            {match.status === 'LIVE' && (
              <div className="mt-1"><Badge className="bg-red-500 text-white text-xs">🔴 LIVE</Badge></div>
            )}
          </div>
          <TeamHeader
            name={match.awayTeam}
            crest={match.awayTeamCrest ?? null}
            rank={getFifaRank(match.awayTeam)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isLocked ? (isFinished ? 'Final result' : 'Match in progress') : 'Your prediction'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLocked ? (
            <div className="space-y-3">
              {existingPred ? (
                <>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Your pick</p>
                    <p className="text-2xl font-bold tabular-nums">{existingPred.predHome} – {existingPred.predAway}</p>
                  </div>
                  {existingPred.points != null && (
                    <div className="text-center">
                      <Badge variant={existingPred.points > 0 ? 'default' : 'secondary'} className="text-base px-4 py-1">
                        {existingPred.points === 2 ? '🎯 Perfect! ' : existingPred.points === 1 ? '✅ ' : '❌ '}
                        {existingPred.points} point{existingPred.points !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center text-sm">
                  🔒 You didn&apos;t submit a prediction for this match.
                </p>
              )}
            </div>
          ) : (
            <PredictionForm
              matchId={match.id}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              existing={existingPred ? { home: existingPred.predHome, away: existingPred.predAway } : null}
            />
          )}
        </CardContent>
      </Card>

      {isFinished && match.goals != null && (
        <MatchStats
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          goals={match.goals as ApiGoal[] | null}
          bookings={match.bookings as ApiBooking[] | null}
        />
      )}

      {isFinished && match.goals != null && (
        <MatchEvents
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          homeCrest={match.homeTeamCrest ?? null}
          awayCrest={match.awayTeamCrest ?? null}
          goals={match.goals as ApiGoal[] | null}
          bookings={match.bookings as ApiBooking[] | null}
        />
      )}

      {isFinished && match.statistics != null && (
        <MatchStatisticsCard
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          statistics={match.statistics as [ApiTeamStats, ApiTeamStats]}
        />
      )}

      {isFinished && match.goals == null && (
        <Card>
          <CardContent className="py-4 text-center text-sm text-muted-foreground">
            Match events not available yet — hit <strong>Sync</strong> on the matches page to load them.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
