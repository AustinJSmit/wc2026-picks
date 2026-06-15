export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PredictionForm from './prediction-form';
import FriendsPredictionsCard from './friends-predictions-card';
import LiveMatchPoller from './live-match-poller';
import MatchEvents from '@/components/match-events';
import { getFifaRank } from '@/lib/fifa-rankings';
import { fetchGroupStandings } from '@/lib/football-api';
import type { ApiGoal, ApiBooking, ApiTeamStats, ApiStandingEntry, ApiLineup, ApiLineupPlayer } from '@/lib/football-api';

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

// ─── StatsCard (stats only — no goals/bookings lists) ───────────────────────

function StatsCard({ homeTeam, awayTeam, homeCrest, awayCrest, statistics }: {
  homeTeam: string; awayTeam: string;
  homeCrest: string | null; awayCrest: string | null;
  statistics: [ApiTeamStats, ApiTeamStats] | null;
}) {
  const norm = (s: string) => s.trim().toLowerCase();
  const home = statistics?.find(s => norm(s.team.name) === norm(homeTeam)) ?? statistics?.[0];
  const away = statistics?.find(s => norm(s.team.name) !== norm(homeTeam)) ?? statistics?.[1];

  const toNum = (v: string | number | null | undefined) =>
    v == null ? null : parseFloat(String(v));

  // Format a stat value for display. Possession: append %. Pass accuracy: ESPN
  // stores as proportion 0–1 (e.g. 0.9 = 90%), so multiply by 100 and append %.
  function fmt(label: string, v: string | number | null | undefined): string {
    if (v == null) return '—';
    if (label === 'Possession') {
      const n = parseFloat(String(v));
      return isNaN(n) ? String(v) : `${n.toFixed(1)}%`;
    }
    if (label === 'Pass accuracy') {
      const n = parseFloat(String(v));
      if (isNaN(n)) return String(v);
      const pct = n <= 1 ? n * 100 : n;
      return `${pct.toFixed(0)}%`;
    }
    return String(v);
  }

  const statRows = (home && away) ? [
    { label: 'Shots', h: home.totalShots, a: away.totalShots },
    { label: 'Shots on target', h: home.shotsOnGoal, a: away.shotsOnGoal },
    { label: 'Saves', h: home.saves, a: away.saves },
    { label: 'Possession', h: home.possession, a: away.possession },
    { label: 'Passes', h: home.totalPasses, a: away.totalPasses },
    { label: 'Pass accuracy', h: home.passAccuracy, a: away.passAccuracy },
    { label: 'Fouls', h: home.fouls, a: away.fouls },
    { label: 'Yellow cards', h: home.yellowCards, a: away.yellowCards },
    { label: 'Red cards', h: home.redCards, a: away.redCards },
    { label: 'Offsides', h: home.offsides, a: away.offsides },
    { label: 'Corners', h: home.corners, a: away.corners },
  ].filter(r => r.h != null || r.a != null) : [];

  if (statRows.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {homeCrest && <img src={homeCrest} alt={homeTeam} className="h-5 w-5 object-contain" />}
            <div className="h-3 w-3 rounded bg-green-600" />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Team Stats</span>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-red-600" />
            {awayCrest && <img src={awayCrest} alt={awayTeam} className="h-5 w-5 object-contain" />}
          </div>
        </div>

        {statRows.map(row => {
          const hNum = toNum(row.h), aNum = toNum(row.a);
          const homeHigher = hNum != null && aNum != null && hNum > aNum;
          const awayHigher = hNum != null && aNum != null && aNum > hNum;
          return (
            <div key={row.label} className="grid grid-cols-3 items-center py-1.5 border-b last:border-0 text-sm">
              <div className="flex justify-start">
                {homeHigher ? (
                  <span className="bg-green-600 text-white text-xs font-bold rounded px-1.5 py-0.5 tabular-nums">
                    {fmt(row.label, row.h)}
                  </span>
                ) : (
                  <span className="tabular-nums">{fmt(row.label, row.h)}</span>
                )}
              </div>
              <span className="text-center text-xs text-muted-foreground">{row.label}</span>
              <div className="flex justify-end">
                {awayHigher ? (
                  <span className="bg-red-600 text-white text-xs font-bold rounded px-1.5 py-0.5 tabular-nums">
                    {fmt(row.label, row.a)}
                  </span>
                ) : (
                  <span className="tabular-nums">{fmt(row.label, row.a)}</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── StandingsCard ────────────────────────────────────────────────────────────

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

// ─── LineupsCard (pitch visualization) ───────────────────────────────────────

function rowsFromFormation(formation: string | null, starters: ApiLineupPlayer[]): ApiLineupPlayer[][] {
  if (!formation) return [starters];
  const parts = [1, ...formation.split('-').map(Number)];
  const rows: ApiLineupPlayer[][] = [];
  let idx = 0;
  for (const count of parts) {
    rows.push(starters.slice(idx, idx + count));
    idx += count;
  }
  // put any leftovers in the last row
  if (idx < starters.length) rows[rows.length - 1].push(...starters.slice(idx));
  return rows;
}

function GoalNet({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div className="flex justify-center py-1.5">
      <div className={`w-20 h-4 border-2 border-white/60 bg-white/5 ${
        position === 'top' ? 'border-b-0 rounded-t-sm' : 'border-t-0 rounded-b-sm'
      }`} />
    </div>
  );
}

function PitchHalf({
  lineup,
  flipped,
}: {
  team: string;
  lineup: ApiLineup;
  flipped: boolean; // true = home (GK at bottom = flex-col-reverse)
}) {
  const rows = rowsFromFormation(lineup.formation, lineup.starters);

  return (
    <div className={`flex ${flipped ? 'flex-col-reverse' : 'flex-col'} gap-2 py-2`}>
      {rows.map((row, ri) => (
        <div key={ri} className="flex justify-around gap-1">
          {row.map((p, pi) => (
            <div key={pi} className="flex flex-col items-center min-w-0 max-w-[52px]">
              <div className="h-5 w-5 rounded-full bg-white/20 border border-white/40 flex items-center justify-center text-[9px] font-bold text-white">
                {p.jersey ?? ''}
              </div>
              <span className="text-[8px] text-white text-center leading-tight truncate w-full text-center mt-0.5">
                {p.name.split(' ').slice(-1)[0]}
              </span>
              {p.position && (
                <span className="text-[7px] text-white/60 text-center leading-none">
                  {p.position.slice(0, 3).toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function LineupsCard({ homeTeam, awayTeam, lineups }: {
  homeTeam: string;
  awayTeam: string;
  lineups: [ApiLineup, ApiLineup];
}) {
  const [home, away] = lineups;
  const hasPitch = home.formation || away.formation;

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">Line-ups</CardTitle>
      </CardHeader>
      <CardContent className={hasPitch ? 'p-0' : undefined}>
        {hasPitch ? (
          /* Pitch visualization — portrait layout, away at top, home at bottom */
          <div
            className="relative mx-0 rounded-b-lg overflow-hidden"
            style={{ background: 'linear-gradient(to bottom, #166534, #15803d)' }}
          >
            {/* Pitch markings */}
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/20" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full border border-white/20" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-white/30" />

            <div className="relative flex flex-col min-h-[560px]">
              {/* Away half — top of pitch, GK at top, attackers toward center */}
              <div className="flex-1 flex flex-col border-b border-white/10">
                <GoalNet position="top" />
                <div className="text-[9px] text-white/60 text-center font-semibold uppercase tracking-wider pb-0.5">
                  {awayTeam}{away.formation ? ` · ${away.formation}` : ''}
                </div>
                <PitchHalf team={awayTeam} lineup={away} flipped={false} />
              </div>
              {/* Home half — bottom of pitch, attackers toward center, GK at bottom */}
              <div className="flex-1 flex flex-col">
                <PitchHalf team={homeTeam} lineup={home} flipped={true} />
                <div className="text-[9px] text-white/60 text-center font-semibold uppercase tracking-wider pt-0.5">
                  {homeTeam}{home.formation ? ` · ${home.formation}` : ''}
                </div>
                <GoalNet position="bottom" />
              </div>
            </div>
          </div>
        ) : (
          /* Fallback: two-column list */
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest truncate">{homeTeam}</p>
              <div className="space-y-0.5">
                {home.starters.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground w-4 text-right shrink-0">{p.jersey ?? ''}</span>
                    <span className="truncate">{p.name}</span>
                    {p.position && <span className="text-[10px] text-muted-foreground shrink-0">{p.position.slice(0, 3).toUpperCase()}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest truncate text-right">{awayTeam}</p>
              <div className="space-y-0.5">
                {away.starters.map((p, i) => (
                  <div key={i} className="flex items-center justify-end gap-1.5 text-xs">
                    {p.position && <span className="text-[10px] text-muted-foreground shrink-0">{p.position.slice(0, 3).toUpperCase()}</span>}
                    <span className="truncate">{p.name}</span>
                    <span className="text-muted-foreground w-4 shrink-0">{p.jersey ?? ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tournament History Card (knockout matches) ───────────────────────────────

function TournamentHistoryCard({
  homeTeam,
  awayTeam,
  homeCrest,
  awayCrest,
  homeHistory,
  awayHistory,
}: {
  homeTeam: string;
  awayTeam: string;
  homeCrest: string | null;
  awayCrest: string | null;
  homeHistory: Array<{ opponent: string; homeScore: number | null; awayScore: number | null; wasHome: boolean; kickoffAt: Date }>;
  awayHistory: Array<{ opponent: string; homeScore: number | null; awayScore: number | null; wasHome: boolean; kickoffAt: Date }>;
}) {
  if (homeHistory.length === 0 && awayHistory.length === 0) return null;

  function resultBadge(match: { homeScore: number | null; awayScore: number | null; wasHome: boolean }) {
    if (match.homeScore == null) return null;
    const teamScore = match.wasHome ? match.homeScore : match.awayScore!;
    const oppScore = match.wasHome ? match.awayScore! : match.homeScore;
    const result = teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'D';
    return (
      <Badge
        variant={result === 'W' ? 'default' : result === 'D' ? 'secondary' : 'outline'}
        className="text-[10px] px-1.5 py-0 h-4 shrink-0"
      >
        {result} {teamScore}–{oppScore}
      </Badge>
    );
  }

  function TeamHistory({ team, crest, history }: {
    team: string;
    crest: string | null;
    history: typeof homeHistory;
  }) {
    return (
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          {crest && <img src={crest} alt={team} className="h-4 w-4 object-contain" />}
          <span className="text-xs font-semibold truncate">{team}</span>
        </div>
        <div className="space-y-1.5">
          {history.map((m, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground truncate">vs {m.opponent}</span>
              {resultBadge(m)}
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-xs text-muted-foreground">No previous matches</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">Tournament History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <TeamHistory team={homeTeam} crest={homeCrest} history={homeHistory} />
          <TeamHistory team={awayTeam} crest={awayCrest} history={awayHistory} />
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
  const isLive = match.status === 'LIVE';

  // Extract group name from stage
  const groupMatch = match.stage?.match(/Group [A-Z]/i);
  const groupName = groupMatch?.[0] ?? null;
  const isKnockout = !groupName && match.stage != null && match.stage.trim() !== '';

  // Fetch group standings (1-hour cached)
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

  const homeGoals = hasEvents ? goalsData.filter(x => norm(x.team.name) === norm(match.homeTeam)) : [];
  const awayGoals = hasEvents ? goalsData.filter(x => norm(x.team.name) === norm(match.awayTeam)) : [];

  // Fetch tournament history for knockout matches
  let homeHistory: Array<{ opponent: string; homeScore: number | null; awayScore: number | null; wasHome: boolean; kickoffAt: Date }> = [];
  let awayHistory: typeof homeHistory = [];

  if (isKnockout && match.homeTeam && match.awayTeam) {
    const allMatches = await db.select().from(matches).where(eq(matches.status, 'FINISHED'));
    homeHistory = allMatches
      .filter(m => m.id !== match.id && (norm(m.homeTeam) === norm(match.homeTeam) || norm(m.awayTeam) === norm(match.homeTeam)))
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
      .map(m => {
        const wasHome = norm(m.homeTeam) === norm(match.homeTeam);
        return { opponent: wasHome ? m.awayTeam : m.homeTeam, homeScore: m.homeScore, awayScore: m.awayScore, wasHome, kickoffAt: new Date(m.kickoffAt) };
      });
    awayHistory = allMatches
      .filter(m => m.id !== match.id && (norm(m.homeTeam) === norm(match.awayTeam) || norm(m.awayTeam) === norm(match.awayTeam)))
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
      .map(m => {
        const wasHome = norm(m.homeTeam) === norm(match.awayTeam);
        return { opponent: wasHome ? m.awayTeam : m.homeTeam, homeScore: m.homeScore, awayScore: m.awayScore, wasHome, kickoffAt: new Date(m.kickoffAt) };
      });
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <LiveMatchPoller isLive={isLive} />

      {/* ── Match header ─────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden bg-card border text-foreground dark:bg-zinc-900 dark:text-white dark:border-transparent">
        <div className="flex items-center justify-between px-4 pt-3 pb-1 text-xs text-muted-foreground">
          <span>
            FIFA World Cup 2026™{groupName ? ` · ${groupName}` : match.stage ? ` · ${match.stage}` : ''} · {formatShortDate(new Date(match.kickoffAt), user.timezone)}
          </span>
          <span className={
            isFinished ? 'text-foreground dark:text-zinc-300' :
            isLive ? 'text-red-500 dark:text-red-400 font-semibold animate-pulse' :
            'text-muted-foreground'
          }>
            {isFinished ? 'Full-time' : isLive ? '🔴 Live' : formatKickoff(new Date(match.kickoffAt), user.timezone)}
          </span>
        </div>

        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {match.homeTeamCrest && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.homeTeamCrest} alt={match.homeTeam} className="h-14 w-14 object-contain" />
            )}
            <span className="font-semibold text-sm text-center leading-tight max-w-[90px]">{match.homeTeam}</span>
            {homePos && <span className="text-[10px] text-muted-foreground">{ordinal(homePos)}</span>}
            <span className="text-[10px] text-muted-foreground/60">FIFA #{getFifaRank(match.homeTeam) ?? '—'}</span>
          </div>

          <div className="text-center px-4 shrink-0">
            {(isFinished || isLive) && match.homeScore != null ? (
              <div className="text-5xl font-bold tabular-nums tracking-tight">
                {match.homeScore} <span className="text-muted-foreground/60">–</span> {match.awayScore}
              </div>
            ) : (
              <>
                <div className="text-2xl font-light text-muted-foreground">vs</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {formatKickoff(new Date(match.kickoffAt), user.timezone)}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {match.awayTeamCrest && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.awayTeamCrest} alt={match.awayTeam} className="h-14 w-14 object-contain" />
            )}
            <span className="font-semibold text-sm text-center leading-tight max-w-[90px]">{match.awayTeam}</span>
            {awayPos && <span className="text-[10px] text-muted-foreground">{ordinal(awayPos)}</span>}
            <span className="text-[10px] text-muted-foreground/60">FIFA #{getFifaRank(match.awayTeam) ?? '—'}</span>
          </div>
        </div>

        {/* Inline goal scorers */}
        {(isFinished || isLive) && hasEvents && (homeGoals.length > 0 || awayGoals.length > 0) && (
          <div className="flex justify-between px-6 pb-3 text-xs text-muted-foreground border-t border-border pt-3">
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
          <div className="px-6 pb-3 text-[10px] text-muted-foreground text-center">
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

      {/* ── Friends' predictions (visible after kickoff) ─────────── */}
      {isLocked && <FriendsPredictionsCard matchId={match.id} />}

      {/* ── Events / stats (finished + live matches) ─────────────── */}
      {(isFinished || isLive) && (() => {
        // goals IS NULL means the ESPN summary endpoint hasn't been called yet
        if (neverSynced) {
          return (
            <Card>
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                {isLive ? 'Events loading…' : 'Match events not yet available.'}
              </CardContent>
            </Card>
          );
        }
        // Stats and events render independently — each component returns null if its data is missing.
        // This ensures 0-0 matches still show possession/shots/etc. even with no goal timeline.
        return (
          <>
            <StatsCard
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              homeCrest={match.homeTeamCrest ?? null}
              awayCrest={match.awayTeamCrest ?? null}
              statistics={match.statistics as [ApiTeamStats, ApiTeamStats] | null}
            />
            <MatchEvents
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              homeCrest={match.homeTeamCrest ?? null}
              awayCrest={match.awayTeamCrest ?? null}
              goals={dataInvalid ? null : goalsData}
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

      {/* ── Tournament history (knockout matches) ────────────────── */}
      {isKnockout && (
        <TournamentHistoryCard
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          homeCrest={match.homeTeamCrest ?? null}
          awayCrest={match.awayTeamCrest ?? null}
          homeHistory={homeHistory}
          awayHistory={awayHistory}
        />
      )}
    </div>
  );
}
