export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { eq, not, like, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

type BracketMatch = typeof matches.$inferSelect & {
  predHome: number | null;
  predAway: number | null;
};

const ROUND_ORDER = [
  'Round of 32',
  'Round of 16',
  'Quarterfinal',
  'Semifinal',
  'Third Place',
  'Final',
];

function getRoundLabel(stage: string | null): string {
  if (!stage) return 'Knockout';
  if (stage.includes('32')) return 'Round of 32';
  if (stage.includes('16')) return 'Round of 16';
  if (stage.includes('Quarter')) return 'Quarterfinal';
  if (stage.includes('Semi')) return 'Semifinal';
  if (stage.includes('Third') || stage.includes('3rd') || stage.includes('Place')) return 'Third Place';
  if (stage.includes('Final')) return 'Final';
  return stage;
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
}

function MatchCard({ match }: { match: BracketMatch }) {
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';
  const homeKnown = match.homeTeam && match.homeTeam !== 'TBD';
  const awayKnown = match.awayTeam && match.awayTeam !== 'TBD';

  return (
    <Link href={`/match/${match.id}`} className="block">
      <div className="border rounded-lg bg-card hover:shadow-md transition-shadow cursor-pointer overflow-hidden text-xs min-w-[160px]">
        {/* Status bar */}
        <div className="px-2 py-0.5 bg-muted text-[10px] text-muted-foreground flex items-center justify-between">
          <span>{formatDate(new Date(match.kickoffAt))}</span>
          {isLive && <span className="text-red-500 font-semibold">● LIVE</span>}
          {isFinished && <span className="text-muted-foreground">FT</span>}
        </div>

        {/* Home team */}
        <div className={`flex items-center gap-1.5 px-2 py-1.5 border-b ${isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'bg-primary/5 font-semibold' : ''}`}>
          {match.homeTeamCrest && homeKnown
            ? <img src={match.homeTeamCrest} alt={match.homeTeam} className="h-4 w-4 object-contain shrink-0" />
            : <div className="h-4 w-4 rounded-full bg-muted shrink-0" />
          }
          <span className="flex-1 truncate">{homeKnown ? match.homeTeam : 'TBD'}</span>
          {(isFinished || isLive) && match.homeScore != null && (
            <span className="font-bold tabular-nums shrink-0">{match.homeScore}</span>
          )}
        </div>

        {/* Away team */}
        <div className={`flex items-center gap-1.5 px-2 py-1.5 ${isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'bg-primary/5 font-semibold' : ''}`}>
          {match.awayTeamCrest && awayKnown
            ? <img src={match.awayTeamCrest} alt={match.awayTeam} className="h-4 w-4 object-contain shrink-0" />
            : <div className="h-4 w-4 rounded-full bg-muted shrink-0" />
          }
          <span className="flex-1 truncate">{awayKnown ? match.awayTeam : 'TBD'}</span>
          {(isFinished || isLive) && match.awayScore != null && (
            <span className="font-bold tabular-nums shrink-0">{match.awayScore}</span>
          )}
        </div>

        {/* User prediction */}
        {match.predHome != null && (
          <div className="px-2 py-1 bg-muted/50 text-[10px] text-muted-foreground flex items-center gap-1">
            <span>Your pick:</span>
            <span className="font-medium tabular-nums">{match.predHome}–{match.predAway}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default async function BracketPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  // Fetch all knockout matches (not group stage)
  const knockoutMatches = await db
    .select()
    .from(matches)
    .where(and(
      not(like(matches.stage, '%Group%')),
      sql`${matches.stage} is not null`,
      sql`${matches.stage} != ''`
    ))
    .orderBy(matches.kickoffAt);

  // Fetch user's predictions for these matches
  const matchIds = knockoutMatches.map(m => m.id);
  const userPreds = matchIds.length > 0
    ? await db.select().from(predictions).where(eq(predictions.userId, user.id))
    : [];
  const predByMatch = Object.fromEntries(userPreds.map(p => [p.matchId, p]));

  // Build bracket matches with prediction data
  const bracketMatches: BracketMatch[] = knockoutMatches.map(m => ({
    ...m,
    predHome: predByMatch[m.id]?.predHome ?? null,
    predAway: predByMatch[m.id]?.predAway ?? null,
  }));

  // Group by round
  const byRound = new Map<string, BracketMatch[]>();
  for (const m of bracketMatches) {
    const round = getRoundLabel(m.stage);
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round)!.push(m);
  }

  // Sort rounds in order
  const rounds = ROUND_ORDER.filter(r => byRound.has(r));
  // Add any unrecognized rounds at the end
  for (const r of byRound.keys()) {
    if (!rounds.includes(r)) rounds.push(r);
  }

  if (bracketMatches.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Bracket</h1>
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">Knockout bracket coming soon</p>
          <p className="text-sm mt-2">The bracket will populate after group stage matches complete (Jun 28+)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Knockout Bracket</h1>
      <p className="text-sm text-muted-foreground mb-6">Click any match to view details or submit your prediction.</p>

      {/* Horizontal scrollable bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {rounds.map(round => {
            const roundMatches = byRound.get(round) ?? [];
            return (
              <div key={round} className="flex flex-col gap-2">
                {/* Round header */}
                <div className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest pb-1 border-b mb-2">
                  {round}
                  <div className="text-[10px] font-normal mt-0.5">{roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}</div>
                </div>

                {/* Matches in this round, with spacing to visually align with bracket flow */}
                <div className="flex flex-col" style={{
                  gap: round === 'Round of 32' ? '8px'
                    : round === 'Round of 16' ? '92px'
                    : round === 'Quarterfinal' ? '220px'
                    : round === 'Semifinal' ? '476px'
                    : '8px',
                  paddingTop: round === 'Round of 16' ? '50px'
                    : round === 'Quarterfinal' ? '164px'
                    : round === 'Semifinal' ? '392px'
                    : '0px',
                }}>
                  {roundMatches.map(match => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simple match list fallback below bracket */}
      <div className="mt-8">
        <h2 className="text-base font-semibold mb-3 text-muted-foreground">All Knockout Matches</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {bracketMatches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}
