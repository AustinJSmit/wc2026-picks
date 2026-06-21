import { NextResponse } from 'next/server';
import { db } from '@/db';
import { matches, predictions, syncState } from '@/db/schema';
import { eq, isNull, desc, and, or, lte } from 'drizzle-orm';
import { fetchESPNFixtures, fetchESPNMatchDetail } from '@/lib/football-api';
import type { ApiMatch } from '@/lib/football-api';
import { calculatePoints } from '@/lib/scoring';

const SYNC_COOLDOWN_MS = 20_000;

export async function POST() {
  const [state] = await db.select().from(syncState).where(eq(syncState.id, 1));
  if (state?.lastSyncedAt && Date.now() - state.lastSyncedAt.getTime() < SYNC_COOLDOWN_MS) {
    return NextResponse.json({ ok: true, skipped: true, matchesSynced: 0, pointsAwarded: 0, failed: 0, detailsFilled: 0 });
  }
  await db
    .insert(syncState)
    .values({ id: 1, lastSyncedAt: new Date() })
    .onConflictDoUpdate({ target: syncState.id, set: { lastSyncedAt: new Date() } });

  let apiMatches: ApiMatch[];
  try {
    apiMatches = await fetchESPNFixtures();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `API fetch failed: ${msg}` }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;

  for (const m of apiMatches) {
    // Skip group stage matches with no team names; always upsert knockout matches (teams may be TBD)
    const isGroupStage = (m.stage ?? '').toLowerCase().includes('group');
    if (isGroupStage && (!m.homeTeam.name || !m.awayTeam.name)) continue;
    try {
      const homeTeamName = m.homeTeam.name || 'TBD';
      const awayTeamName = m.awayTeam.name || 'TBD';
      const insertValues = {
        apiId: String(m.id),
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        kickoffAt: new Date(m.utcDate),
        status: m.status,
        clock: m.clock ?? null,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        stage: m.stage ?? null,
        homeTeamCrest: m.homeTeam.crest || null,
        awayTeamCrest: m.awayTeam.crest || null,
      };
      // On conflict: update schedule/score/team fields (teams may become known over time); never overwrite ESPN event data
      const updateValues = {
        homeTeam: homeTeamName,
        awayTeam: awayTeamName,
        status: m.status,
        clock: m.clock ?? null,
        homeScore: m.score.fullTime.home,
        awayScore: m.score.fullTime.away,
        kickoffAt: new Date(m.utcDate),
        stage: m.stage ?? null,
        homeTeamCrest: m.homeTeam.crest || null,
        awayTeamCrest: m.awayTeam.crest || null,
      };

      await db
        .insert(matches)
        .values(insertValues)
        .onConflictDoUpdate({ target: matches.apiId, set: updateValues });

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
  const detailResults: { apiId: string; status: 'ok' | 'error'; goalsFound: number; valid?: boolean; goalCountMatches?: boolean; expectedGoals?: number; error?: string }[] = [];

  try {
    const needsDetail = await db
      .select({
        id: matches.id,
        apiId: matches.apiId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        goals: matches.goals,
        status: matches.status,
      })
      .from(matches)
      .where(
        or(
          // LIVE matches: always re-fetch so in-progress goals/cards stay current
          eq(matches.status, 'LIVE'),
          // FINISHED matches: fetch if goals, lineups, or statistics are still missing
          and(
            eq(matches.status, 'FINISHED'),
            or(isNull(matches.goals), isNull(matches.lineups), isNull(matches.statistics), isNull(matches.bookings))
          )
        )
      )
      .orderBy(desc(matches.kickoffAt))
      .limit(10);

    for (const match of needsDetail) {
      try {
        // apiId is now the ESPN event ID — use it directly
        if (!match.apiId) {
          detailResults.push({ apiId: match.apiId ?? '', status: 'error', goalsFound: 0, error: 'No ESPN ID' });
          continue;
        }

        const detail = await fetchESPNMatchDetail(match.apiId);

        const totalExpected = (match.homeScore ?? 0) + (match.awayScore ?? 0);
        // Accept partial goal data — ESPN keyEvents sometimes misses own-goals or penalty encodings.
        // Only reject if ESPN returned 0 goals when we expect goals (likely a failed fetch).
        const isLiveMatch = match.status === 'LIVE';
        const validData = totalExpected === 0 || detail.goals.length > 0;
        const goalCountMatches = detail.goals.length === totalExpected;
        // For LIVE matches, always overwrite goals so each sync reflects current state
        const goalsAlreadyFilled = !isLiveMatch && match.goals !== null;

        if (validData && !goalsAlreadyFilled) {
          // Full update: goals + bookings + stats + lineups + venue + attendance
          await db.update(matches)
            .set({
              goals: detail.goals.length > 0 ? detail.goals : [],
              bookings: detail.bookings.length > 0 ? detail.bookings : null,
              statistics: detail.statistics ?? null,
              lineups: detail.lineups ?? null,
              venue: detail.venue ?? null,
              attendance: detail.attendance ?? null,
            })
            .where(eq(matches.id, match.id));
          detailsFilled++;
        } else if (goalsAlreadyFilled) {
          // Goals already filled — backfill bookings + supplemental data
          await db.update(matches)
            .set({
              bookings: detail.bookings.length > 0 ? detail.bookings : null,
              lineups: detail.lineups ?? null,
              venue: detail.venue ?? null,
              attendance: detail.attendance ?? null,
            })
            .where(eq(matches.id, match.id));
        }
        // else: 0 goals returned from ESPN when we expect some — leave NULL and retry next sync

        detailResults.push({
          apiId: match.apiId ?? '',
          status: 'ok',
          goalsFound: detail.goals.length,
          valid: validData,
          goalCountMatches,
          ...(!goalCountMatches && { expectedGoals: totalExpected }),
        });
      } catch (err) {
        detailResults.push({ apiId: match.apiId ?? '', status: 'error', goalsFound: 0, error: String(err) });
      }
    }
  } catch {
    // non-fatal; main sync already succeeded
  }

  // Upcoming matches: re-fetch lineups every sync so announced/changed lineups stay current
  try {
    const upcoming = await db
      .select({ id: matches.id, apiId: matches.apiId })
      .from(matches)
      .where(
        and(
          eq(matches.status, 'SCHEDULED'),
          lte(matches.kickoffAt, new Date(Date.now() + 48 * 60 * 60 * 1000))
        )
      )
      .orderBy(matches.kickoffAt)
      .limit(5);

    for (const match of upcoming) {
      try {
        const detail = await fetchESPNMatchDetail(match.apiId!);
        if (detail.lineups) {
          await db.update(matches)
            .set({ lineups: detail.lineups })
            .where(eq(matches.id, match.id));
        }
      } catch { /* non-fatal */ }
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({
    ok: true,
    matchesSynced: synced,
    pointsAwarded,
    failed,
    detailsFilled,
    detailResults,
  });
}
