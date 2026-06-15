import { NextResponse } from 'next/server';
import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { fetchWCMatches } from '@/lib/football-api';
import { calculatePoints } from '@/lib/scoring';

export async function POST() {
  try {
    const apiMatches = await fetchWCMatches();

    for (const m of apiMatches) {
      const values = {
        apiId: String(m.id),
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        kickoffAt: new Date(m.utcDate),
        status: m.status,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
      };

      await db
        .insert(matches)
        .values(values)
        .onConflictDoUpdate({ target: matches.apiId, set: values });
    }

    // Award points for finished matches where predictions haven't been scored yet
    const finishedMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.status, 'FINISHED'));

    let pointsAwarded = 0;

    for (const match of finishedMatches) {
      if (match.homeScore == null || match.awayScore == null) continue;

      const unscoredPredictions = await db
        .select()
        .from(predictions)
        .where(eq(predictions.matchId, match.id));

      for (const pred of unscoredPredictions) {
        if (pred.points !== null) continue; // already scored
        const pts = calculatePoints(pred, match);
        if (pts !== null) {
          await db.update(predictions).set({ points: pts }).where(eq(predictions.id, pred.id));
          pointsAwarded++;
        }
      }
    }

    return NextResponse.json({ ok: true, matchesSynced: apiMatches.length, pointsAwarded });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
