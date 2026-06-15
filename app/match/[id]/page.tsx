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
import { fetchGroupStandings } from '@/lib/football-api';
import type { ApiGoal, ApiBooking, ApiTeamStats, ApiStandingEntry, ApiLineup } from '@/lib/football-api';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatShortDate(date: Date, tz?: string | null) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(tz ? { timeZone: tz } : {}),
  }).format(date);
}

function formatKickoff(date: Date, tz?: string | null) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    ...(tz ? { timeZone: tz } : {}),
  }).format(date);
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function scorerLine(goal: ApiGoal) {
  return `${goal.scorer.name} ${goal.minute}'${goal.injuryTime ? `+${goal.injuryTime}` : ''}${goal.type === 'OWN_GOAL' ? ' (OG)' : goal.type === 'PENALTY' ? ' (P)' : ''}`;
}

// ─── Components ─────────────────────────────────────────────────────────────

function StatsCard({ homeTeam, awayTeam, homeCrest, awayCrest, goals, bookings, statistics }: {
  homeTeam: string; awayTeam: string;
  homeCrest: string | null; awayCrest: string | null;
  goals: ApiGoal[]; bookings: ApiBooking[] | null;
  statistics: [ApiTeamStats, ApiTeamStats] | null;
}) {
  const norm = (s: string) => s.trim().toLowerCase();
  const homeGoals = goals.filter(x => norm(x.team.name) === norm(homeTeam));
  const awayGoals = goals.filter(x => norm(x.team.name) === norm(awayTeam));
  const b = bookings ?? [];
  const homeBookings = b.filter(x => norm(x.team.name) === norm(homeTeam));
  const awayBookings = b.filter(x => norm(x.team.name) === norm(awayTeam));
  const goalsMatched = homeGoals.length + awayGoals.length > 0;

  const home = statistics?.find(s => norm(s.team.name) === norm(homeTeam)) ?? statistics?.[0];
  const away = statistics?.find(s => norm(s.team.name) !== norm(homeTeam)) ?? statistics?.[1];

  const toNum = (v: string | number | null | undefined) =>
    v == null ? null : parseFloat(String(v));

  const statRows = (home && away) ? [
    { label: 'Shots', h: home.totalShots, a: away.totalShots },
    { label: 'Shots on target', h: home.shotsOnGoal, a: away.shotsOnGoal },
    { label: 'Possession', h: home.possession, a: away.possession },
    { label: 'Passes', h: home.totalPasses, a: away.totalPasses },
    { label: 'Pass accuracy', h: home.passAccuracy, a: away.passAccuracy },
    { label: 'Fouls', h: home.fouls, a: away.fouls },
    { label: 'Yellow cards', h: home.yellowCards, a: away.yellowCards },
    { label: 'Red cards', h: home.redCards, a: away.redCards },
    { label: 'Offsides', h: home.offsides, a: away.offsides },
    { label: 'Corners', h: home.corners, a: away.corners },
  ].filter(r => r.h != null || r.a != null) : [];

  const hasGoals = goals.length > 0;
  const hasBookings = b.length > 0;
  if (!hasGoals && !hasBookings && statRows.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Stats header with crests + colored squares */}
        {statRows.length > 0 && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {homeCrest && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={homeCrest} alt={homeTeam} className="h-5 w-5 object-contain" />
              )}
              <div className="h-3 w-3 rounded bg-green-600" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Team Stats</span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-red-600" />
              {awayCrest && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={awayCrest} alt={awayTeam} className="h-5 w-5 object-contain" />
              )}
            </div>
          </div>
        )}

        {/* Stat rows with color-highlighted winners */}
        {statRows.map(row => {
          const hNum = toNum(row.h), aNum = toNum(row.a);
          const homeHigher = hNum != null && aNum != null && hNum > aNum;
          const awayHigher = hNum != null && aNum != null && aNum > hNum;
          return (
            <div key={row.label} className="grid grid-cols-3 items-center py-1.5 border-b last:border-0 text-sm">
              <div className="flex justify-start">
                {homeHigher ? (
                  <span className="bg-green-600 text-white text-xs font-bold rounded px-1.5 py-0.5 tabular-nums">
                    {row.h}
                  </span>
                ) : (
                  <span className="tabular-nums">{row.h ?? '—'}</span>
                )}
              </div>
              <span className="text-center text-xs text-muted-foreground">{row.label}</span>
              <div className="flex justify-end">
                {awayHigher ? (
                  <span className="bg-red-600 text-white text-xs font-bold rounded px-1.5 py-0.5 tabular-nums">
                    {row.a}
                  </span>
                ) : (
                  <span className="tabular-nums">{row.a ?? '—'}</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Goal scorers summary */}
        {hasGoals && (
          <div className={`grid grid-cols-2 gap-2 text-sm ${statRows.length > 0 ? 'mt-3 pt-3 border-t' : ''}`}>
            <div className="space-y-0.5">
              {goalsMatched
                ? homeGoals.map((g, i) => <p key={i} className="text-xs">⚽ {scorerLine(g)}</p>)
                : goals.sort((a, b) => a.minute - b.minute).map((g, i) => (
                    <p key={i} className="text-xs">⚽ {scorerLine(g)} ({g.team.name})</p>
                  ))
              }
            </div>
            {goalsMatched && (
              <div className="space-y-0.5 text-right">
                {awayGoals.map((g, i) => <p key={i} className="text-xs">⚽ {scorerLine(g)}</p>)}
              </div>
            )}
          </div>
        )}

        {/* Bookings */}
        {hasBookings && (
          <div className="grid grid-cols-2 gap-2 text-sm mt-2 pt-2 border-t">
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

function StandingsCard({ groupName, standings, homeTeam, awayTeam }: {
  groupName: string;
  standings: ApiStandingEntry[];
  homeTeam: string;
  awayTeam: string;
}) {
  if (standings.length === 0) return null;
  const norm = (s: string) => s.trim().toLowerCase();

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">Standings</CardTitle>
        <p className="text-xs text-muted-foreground uppercase tracking-widest">{groupName}</p>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <div
          className="grid px-4 py-1 text-[10px] text-muted-foreground border-b"
          style={{ gridTemplateColumns: '16px 1fr 26px 26px 26px 26px 32px 28px' }}
        >
          <span />
          <span>Team</span>
          <span className="text-center">MP</span>
          <span className="text-center">W</span>
          <span className="text-center">D</span>
          <span className="text-center">L</span>
          <span className="text-center">GD</span>
          <span className="text-center font-semibold">Pts</span>
        </div>
        {standings.map(s => {
          const isMatch = norm(s.team.name) === norm(homeTeam) || norm(s.team.name) === norm(awayTeam);
          const gd = s.goalsDiff;
          return (
            <div
              key={s.rank}
              className={`grid items-center px-4 py-1.5 text-xs border-b last:border-0 ${isMatch ? 'bg-muted/50 font-medium' : ''}`}
              style={{ gridTemplateColumns: '16px 1fr 26px 26px 26px 26px 32px 28px' }}
            >
              <span className="text-muted-foreground text-[10px]">{s.rank}</span>
              <div className="flex items-center gap-1.5 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.team.logo} alt={s.team.name} className="h-4 w-4 object-contain shrink-0" />
                <span className="truncate">{s.team.name}</span>
              </div>
              <span className="text-center">{s.all.played}</span>
              <span className="text-center">{s.all.win}</span>
              <span className="text-center">{s.all.draw}</span>
              <span className="text-center">{s.all.lose}</span>
              <span className="text-center text-[10px]">{gd > 0 ? `+${gd}` : gd}</span>
              <span className="text-center font-bold">{s.points}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function LineupsCard({ homeTeam, awayTeam, lineups }: {
  homeTeam: string;
  awayTeam: string;
  lineups: [ApiLineup, ApiLineup];
}) {
  const [home, away] = lineups;
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">Line-ups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-widest truncate">{homeTeam}</p>
            {home.formation && <p className="text-[10px] text-muted-foreground mb-2">{home.formation}</p>}
            <div className="space-y-0.5">
              {home.starters.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground w-4 text-right shrink-0">{p.jersey ?? ''}</span>
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-widest truncate text-right">{awayTeam}</p>
            {away.formation && <p className="text-[10px] text-muted-foreground mb-2 text-right">{away.formation}</p>}
            <div className="space-y-0.5">
              {away.starters.map((p, i) => (
                <div key={i} className="flex items-center justify-end gap-1.5 text-xs">
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted-foreground w-4 shrink-0">{p.jersey ?? ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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

  // Extract group name from stage (e.g. "Group A" from "Group Stage - Group A" or "Group A")
  const groupMatch = match.stage?.match(/Group [A-Z]/i);
  const groupName = groupMatch?.[0] ?? null;

  // Fetch group standings (1-hour cached fetch, separate from force-dynamic page cache)
  const standings = groupName
    ? await fetchGroupStandings(groupName).catch(() => null)
    : null;

  const norm = (s: string) => s.trim().toLowerCase();
  const homePos = standings?.find(s => norm(s.team.name) === norm(match.homeTeam))?.rank ?? null;
  const awayPos = standings?.find(s => norm(s.team.name) === norm(match.awayTeam))?.rank ?? null;

  // Determine event data state
  const goalsData = match.goals as ApiGoal[] | null;
  const expectedGoals = (match.homeScore ?? 0) + (match.awayScore ?? 0);
  const neverSynced = goalsData === null;
  const dataInvalid = Array.isArray(goalsData) && goalsData.length === 0 && expectedGoals > 0;
  const hasEvents = Array.isArray(goalsData) && goalsData.length > 0;

  // Pre-derive goal scorer lists (used in header + StatsCard)
  const homeGoals = hasEvents ? goalsData.filter(x => norm(x.team.name) === norm(match.homeTeam)) : [];
  const awayGoals = hasEvents ? goalsData.filter(x => norm(x.team.name) === norm(match.awayTeam)) : [];

  return (
    <div className="max-w-lg mx-auto space-y-4">

      {/* ── Dark match header ────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden bg-zinc-900 text-white">
        {/* Top bar: competition + date + status */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 text-xs text-zinc-400">
          <span>
            FIFA World Cup 2026™{groupName ? ` · ${groupName}` : ''} · {formatShortDate(new Date(match.kickoffAt), user.timezone)}
          </span>
          <span className={
            isFinished ? 'text-zinc-300' :
            match.status === 'LIVE' ? 'text-red-400 font-semibold' :
            'text-zinc-400'
          }>
            {isFinished ? 'Full-time' : match.status === 'LIVE' ? '🔴 Live' : formatKickoff(new Date(match.kickoffAt), user.timezone)}
          </span>
        </div>

        {/* Score row */}
        <div className="flex items-center justify-between px-6 py-5">
          {/* Home team */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {match.homeTeamCrest && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.homeTeamCrest} alt={match.homeTeam} className="h-14 w-14 object-contain" />
            )}
            <span className="font-semibold text-sm text-center leading-tight max-w-[90px]">{match.homeTeam}</span>
            {homePos && <span className="text-[10px] text-zinc-500">{ordinal(homePos)}</span>}
            <span className="text-[10px] text-zinc-600">FIFA #{getFifaRank(match.homeTeam) ?? '—'}</span>
          </div>

          {/* Score */}
          <div className="text-center px-4 shrink-0">
            {(isFinished || match.status === 'LIVE') && match.homeScore != null ? (
              <div className="text-5xl font-bold tabular-nums tracking-tight">
                {match.homeScore} <span className="text-zinc-600">–</span> {match.awayScore}
              </div>
            ) : (
              <>
                <div className="text-2xl font-light text-zinc-500">vs</div>
                <div className="text-[10px] text-zinc-500 mt-1">
                  {formatKickoff(new Date(match.kickoffAt), user.timezone)}
                </div>
              </>
            )}
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {match.awayTeamCrest && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.awayTeamCrest} alt={match.awayTeam} className="h-14 w-14 object-contain" />
            )}
            <span className="font-semibold text-sm text-center leading-tight max-w-[90px]">{match.awayTeam}</span>
            {awayPos && <span className="text-[10px] text-zinc-500">{ordinal(awayPos)}</span>}
            <span className="text-[10px] text-zinc-600">FIFA #{getFifaRank(match.awayTeam) ?? '—'}</span>
          </div>
        </div>

        {/* Inline goal scorers */}
        {isFinished && hasEvents && (homeGoals.length > 0 || awayGoals.length > 0) && (
          <div className="flex justify-between px-6 pb-3 text-xs text-zinc-400 border-t border-zinc-800 pt-3">
            <div className="space-y-0.5 flex-1">
              {homeGoals.map((g, i) => <div key={i}>⚽ {scorerLine(g)}</div>)}
            </div>
            <div className="space-y-0.5 flex-1 text-right">
              {awayGoals.map((g, i) => <div key={i}>{scorerLine(g)} ⚽</div>)}
            </div>
          </div>
        )}

        {/* Venue + attendance */}
        {isFinished && (match.venue || match.attendance) && (
          <div className="px-6 pb-3 text-[10px] text-zinc-500 text-center">
            {[match.venue, match.attendance ? match.attendance.toLocaleString() + ' att.' : null]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
      </div>

      {/* ── Prediction card ──────────────────────────────────────── */}
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

      {/* ── Events / stats / messages (finished matches only) ────── */}
      {isFinished && (() => {
        if (neverSynced) {
          return (
            <Card>
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                Match events not available yet — hit <strong>Sync</strong> on the matches page to load them.
              </CardContent>
            </Card>
          );
        }
        if (dataInvalid) {
          return (
            <Card>
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                Match events temporarily unavailable — API data issue for this fixture.
              </CardContent>
            </Card>
          );
        }
        if (!hasEvents) return null; // 0-0, no events expected

        return (
          <>
            <StatsCard
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              homeCrest={match.homeTeamCrest ?? null}
              awayCrest={match.awayTeamCrest ?? null}
              goals={goalsData}
              bookings={match.bookings as ApiBooking[] | null}
              statistics={match.statistics as [ApiTeamStats, ApiTeamStats] | null}
            />
            <MatchEvents
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              homeCrest={match.homeTeamCrest ?? null}
              awayCrest={match.awayTeamCrest ?? null}
              goals={goalsData}
              bookings={match.bookings as ApiBooking[] | null}
            />
          </>
        );
      })()}

      {/* ── Group standings ──────────────────────────────────────── */}
      {standings && groupName && (
        <StandingsCard
          groupName={groupName}
          standings={standings}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
        />
      )}

      {/* ── Line-ups ─────────────────────────────────────────────── */}
      {isFinished && (() => {
        const lineupsData = match.lineups as [ApiLineup, ApiLineup] | null;
        if (!lineupsData) return null;
        return (
          <LineupsCard
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            lineups={lineupsData}
          />
        );
      })()}
    </div>
  );
}
