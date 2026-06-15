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
import type { ApiGoal, ApiBooking } from '@/lib/football-api';

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

  const homeGoals = g.filter(x => x.team.name === homeTeam);
  const awayGoals = g.filter(x => x.team.name === awayTeam);
  const homeYellow = b.filter(x => x.team.name === homeTeam && x.card === 'YELLOW_CARD').length;
  const awayYellow = b.filter(x => x.team.name === awayTeam && x.card === 'YELLOW_CARD').length;
  const homeRed = b.filter(x => x.team.name === homeTeam && x.card === 'RED_CARD').length;
  const awayRed = b.filter(x => x.team.name === awayTeam && x.card === 'RED_CARD').length;

  const scorerList = (goals: ApiGoal[]) =>
    goals.map(g => `${g.scorer.name} ${g.minute}'${g.injuryTime ? `+${g.injuryTime}` : ''}${g.type === 'OWN_GOAL' ? ' (OG)' : g.type === 'PENALTY' ? ' (P)' : ''}`);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Match Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {g.length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-0.5">
              {scorerList(homeGoals).map((s, i) => <p key={i} className="text-xs">⚽ {s}</p>)}
            </div>
            <div className="space-y-0.5 text-right">
              {scorerList(awayGoals).map((s, i) => <p key={i} className="text-xs">⚽ {s}</p>)}
            </div>
          </div>
        )}
        {(homeYellow > 0 || awayYellow > 0) && (
          <div className="grid grid-cols-2 gap-2 text-sm border-t pt-2">
            <span className="text-xs">🟨 {homeYellow}</span>
            <span className="text-xs text-right">🟨 {awayYellow}</span>
          </div>
        )}
        {(homeRed > 0 || awayRed > 0) && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-xs">🟥 {homeRed}</span>
            <span className="text-xs text-right">🟥 {awayRed}</span>
          </div>
        )}
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
          goals={match.goals as ApiGoal[] | null}
          bookings={match.bookings as ApiBooking[] | null}
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
