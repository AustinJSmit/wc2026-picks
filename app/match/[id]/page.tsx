export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PredictionForm from './prediction-form';

function formatKickoff(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
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

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">{formatKickoff(new Date(match.kickoffAt))}</p>
        <h1 className="text-2xl font-bold">
          {match.homeTeam} <span className="text-muted-foreground font-normal text-lg">vs</span> {match.awayTeam}
        </h1>
        {match.status === 'LIVE' && (
          <Badge className="bg-red-500 text-white">🔴 LIVE</Badge>
        )}
        {isFinished && match.homeScore != null && (
          <div className="text-3xl font-bold tabular-nums">
            {match.homeScore} – {match.awayScore}
          </div>
        )}
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
    </div>
  );
}
