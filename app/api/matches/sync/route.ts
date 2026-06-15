import { NextResponse } from 'next/server';
import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { eq, isNull, desc, and } from 'drizzle-orm';
import { fetchWCMatches, findESPNEventId, fetchESPNMatchDetail } from '@/lib/football-api';
import type { ApiMatch } from '@/lib/football-api';
import { calculatePoints } from '@/lib/scoring';

export async function POST() {
  let apiMatches: ApiMatch[];
  try {
    apiMatches = await fetchWCMatches();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `API fetch failed: ${msg}` }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;

  for (const m of apiMatches) {
    if (!m.homeTeam.name || !m.awayTeam.name) continue; // skip TBD knockout matches
    try {
      const values = {
        apiId: String(m.id),
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        kickoffAt: new Date(m.utcDate),
        status: m.status,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        stage: m.stage ?? null,
        homeTeamCrest: m.homeTeam.crest ?? null,
        awayTeamCrest: m.awayTeam.crest ?? null,
        goals: m.goals.length > 0 ? m.goals : null,
        bookings: m.bookings.length > 0 ? m.bookings : null,
      };

      await db
        .insert(matches)
        .values(values)
        .onConflictDoUpdate({ target: matches.apiId, set: values });

      synced++;
    } catch {
      failed++;
    }
  }

  let pointsAwarded = 0;
  try {
    const finishedMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.status, 'FINISHED'));

    for (const match of finishedMatches) {
      if (match.homeScore == null || match.awayScore == null) continue;

      const unscoredPredictions = await db
        .select()
        .from(predictions)
        .where(eq(predictions.matchId, match.id));

      for (const pred of unscoredPredictions) {
        if (pred.points !== null) continue;
        const pts = calculatePoints(pred, match);
        if (pts !== null) {
          await db.update(predictions).set({ points: pts }).where(eq(predictions.id, pred.id));
          pointsAwarded++;
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Scoring failed: ${msg}`, matchesSynced: synced, failed }, { status: 500 });
  }

  // Back-fill goals/bookings/statistics for recently finished matches that are still missing them
  let detailsFilled = 0;
  const detailResults: { apiId: string; status: 'ok' | 'error'; goalsFound: number; valid?: boolean; error?: string }[] = [];

  try {
    const needsDetail = await db
      .select({
        id: matches.id,
        apiId: matches.apiId,
        espnId: matches.espnId,
        homeTeam: matches.homeTeam,
        awayTeam: matches.awayTeam,
        kickoffAt: matches.kickoffAt,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .where(and(eq(matches.status, 'FINISHED'), isNull(matches.goals)))
      .orderBy(desc(matches.kickoffAt))
      .limit(4);

    for (const match of needsDetail) {
      try {
        // Get ESPN event ID — use cached value or look up by date + team names
        let espnId = match.espnId;
        if (!espnId) {
          espnId = await findESPNEventId(match.kickoffAt!, match.homeTeam, match.awayTeam);
          if (espnId) {
            await db.update(matches).set({ espnId }).where(eq(matches.id, match.id));
          }
        }

        if (!espnId) {
          detailResults.push({ apiId: match.apiId ?? '', status: 'error', goalsFound: 0, error: 'ESPN event not found' });
          continue;
        }

        const detail = await fetchESPNMatchDetail(espnId);

        // Sanity check: ESPN goal count should match the stored final score
        const totalExpected = (match.homeScore ?? 0) + (match.awayScore ?? 0);
        const validData = detail.goals.length === totalExpected;

        await db.update(matches)
          .set({
            goals: validData ? (detail.goals.length > 0 ? detail.goals : []) : [],
            bookings: validData && detail.bookings.length > 0 ? detail.bookings : null,
            statistics: validData ? (detail.statistics ?? null) : null,
          })
          .where(eq(matches.id, match.id));

        detailResults.push({ apiId: match.apiId ?? '', status: 'ok', goalsFound: detail.goals.length, valid: validData });
        if (validData && detail.goals.length > 0) detailsFilled++;
      } catch (err) {
        detailResults.push({ apiId: match.apiId ?? '', status: 'error', goalsFound: 0, error: String(err) });
      }
    }
  } catch {
    // non-fatal; main sync already succeeded
  }

  // Count how many finished matches got goals from the competition endpoint this sync
  const goalsFromCompetitionEndpoint = apiMatches.filter(m => m.goals.length > 0 && m.status === 'FINISHED').length;

  return NextResponse.json({
    ok: true,
    matchesSynced: synced,
    pointsAwarded,
    failed,
    detailsFilled,
    detailResults,
    goalsFromCompetitionEndpoint,
  });
}
