export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { matches, predictions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

type BracketMatch = typeof matches.$inferSelect & {
  predHome: number | null;
  predAway: number | null;
};

const MAIN_ROUNDS = ['Round of 32', 'Round of 16', 'Quarterfinal', 'Semifinal'];

function getRoundLabel(stage: string | null): string {
  if (!stage) return 'Knockout';
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
            ? <img src={match.homeTeamCrest} alt={match.homeTeam ?? ''} className="h-4 w-4 object-contain shrink-0" />
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
            ? <img src={match.awayTeamCrest} alt={match.awayTeam ?? ''} className="h-4 w-4 object-contain shrink-0" />
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

// Draws bracket connector arms between adjacent round columns.
// Each arm joins a pair of left-round cards pointing to one right-round card.
function ConnectorColumn({ pairs }: { pairs: number }) {
  return (
    <div className="self-stretch flex flex-col pointer-events-none w-5 shrink-0">
      {Array.from({ length: pairs }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col">
          <div className="flex-1 border-r border-t border-zinc-300 dark:border-zinc-700" />
          <div className="flex-1 border-r border-b border-zinc-300 dark:border-zinc-700" />
        </div>
      ))}
    </div>
  );
}

export default async function BracketPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const allMatchRows = await db.select().from(matches).orderBy(matches.kickoffAt);
  const knockoutMatches = allMatchRows.filter(m =>
    m.stage != null && m.stage.trim() !== '' && !/^Group [A-Z]$/i.test(m.stage)
  );

  const matchIds = knockoutMatches.map(m => m.id);
  const userPreds = matchIds.length > 0
    ? await db.select().from(predictions).where(eq(predictions.userId, user.id))
    : [];
  const predByMatch = Object.fromEntries(userPreds.map(p => [p.matchId, p]));

  const bracketMatches: BracketMatch[] = knockoutMatches.map(m => ({
    ...m,
    predHome: predByMatch[m.id]?.predHome ?? null,
    predAway: predByMatch[m.id]?.predAway ?? null,
  }));

  const byRound = new Map<string, BracketMatch[]>();
  for (const m of bracketMatches) {
    const round = getRoundLabel(m.stage);
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round)!.push(m);
  }

  // Final and 3rd Place are extracted and rendered in a special centered column
  const finalMatch = byRound.get('Final')?.[0] ?? null;
  const thirdPlaceMatch = byRound.get('3rd Place Match')?.[0] ?? null;

  const mainRounds = MAIN_ROUNDS.filter(r => byRound.has(r));

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

  // Gap and paddingTop per round so each round's cards align with the midpoint
  // of the pairs in the previous round (visually creates a funnel toward center).
  const GAP: Record<string, string> = {
    'Round of 32': '8px',
    'Round of 16': '92px',
    'Quarterfinal': '220px',
    'Semifinal': '476px',
  };
  const PADDING_TOP: Record<string, string> = {
    'Round of 32': '0px',
    'Round of 16': '50px',
    'Quarterfinal': '164px',
    'Semifinal': '392px',
  };

  // Finals column paddingTop: centers the Final+3P block between the two SF cards.
  // SF[0].center ≈ 437px, SF[1].center ≈ 1003px → midpoint ≈ 720px.
  // Two-card block height ≈ 196px → top ≈ 720 - 98 = 622px.
  const FINALS_PADDING_TOP = '622px';

  return (
    <div className="max-w-[1100px] mx-auto">
      <h1 className="text-2xl font-bold mb-2">Knockout Bracket</h1>
      <p className="text-sm text-muted-foreground mb-6">Click any match to view details or submit your prediction.</p>

      <div className="overflow-x-auto pb-6">
        <div className="flex items-start min-w-max">

          {mainRounds.map((round, roundIdx) => {
            const roundMatches = byRound.get(round) ?? [];
            const isLastMain = roundIdx === mainRounds.length - 1;
            const pairs = Math.ceil(roundMatches.length / 2);

            return (
              <div key={round} className="flex items-start">
                {/* Round column */}
                <div className="flex flex-col">
                  <div className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-widest pb-1 border-b mb-3 px-1 min-w-[160px]">
                    {round}
                  </div>
                  <div className="flex flex-col" style={{
                    gap: GAP[round] ?? '8px',
                    paddingTop: PADDING_TOP[round] ?? '0px',
                  }}>
                    {roundMatches.map(match => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>

                {/* Connector column linking this round to the next */}
                {!isLastMain && <ConnectorColumn pairs={pairs} />}

                {/* Single connector arm from SF to the Finals column */}
                {isLastMain && (finalMatch || thirdPlaceMatch) && (
                  <ConnectorColumn pairs={1} />
                )}
              </div>
            );
          })}

          {/* Finals column: Final + 3rd Place Match vertically centered between the SF cards */}
          {(finalMatch || thirdPlaceMatch) && (
            <div className="flex flex-col">
              <div className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-widest pb-1 border-b mb-3 px-1 min-w-[160px]">
                Finals
              </div>
              <div className="flex flex-col gap-4" style={{ paddingTop: FINALS_PADDING_TOP }}>
                {finalMatch && (
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1 text-center">
                      Final
                    </div>
                    <MatchCard match={finalMatch} />
                  </div>
                )}
                {thirdPlaceMatch && (
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1 text-center">
                      3rd Place
                    </div>
                    <MatchCard match={thirdPlaceMatch} />
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
