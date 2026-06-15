import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApiGoal, ApiBooking } from '@/lib/football-api';

interface Props {
  homeTeam: string;
  awayTeam: string;
  homeCrest?: string | null;
  awayCrest?: string | null;
  goals: ApiGoal[] | null;
  bookings: ApiBooking[] | null;
}

type Event =
  | { kind: 'goal'; minute: number; injuryTime?: number | null; team: string; scorer: string; type: ApiGoal['type']; assist?: string | null }
  | { kind: 'booking'; minute: number; team: string; player: string; card: ApiBooking['card'] };

function formatMinute(minute: number, injuryTime?: number | null) {
  return injuryTime ? `${minute}+${injuryTime}'` : `${minute}'`;
}

export default function MatchEvents({ homeTeam, awayTeam, homeCrest, awayCrest, goals, bookings }: Props) {
  if (!goals && !bookings) return null;

  const events: Event[] = [
    ...(goals ?? []).map((g): Event => ({
      kind: 'goal', minute: g.minute, injuryTime: g.injuryTime, team: g.team.name, scorer: g.scorer.name, type: g.type, assist: g.assist?.name ?? null,
    })),
    ...(bookings ?? []).map((b): Event => ({
      kind: 'booking', minute: b.minute, team: b.team.name, player: b.player.name, card: b.card,
    })),
  ].sort((a, b) => a.minute - b.minute);

  if (events.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Match Events</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {events.map((ev, i) => {
            const isHome = ev.team === homeTeam;
            const crestSrc = isHome ? homeCrest : awayCrest;
            const sideBadge = crestSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={crestSrc} alt={isHome ? homeTeam : awayTeam} className="h-4 w-4 object-contain shrink-0" />
            ) : (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
                {isHome ? 'H' : 'A'}
              </Badge>
            );

            if (ev.kind === 'goal') {
              const typeLabel = ev.type === 'OWN_GOAL' ? 'OG' : ev.type === 'PENALTY' ? 'P' : null;
              return (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-10 text-right text-xs text-muted-foreground tabular-nums shrink-0">
                    {formatMinute(ev.minute, ev.injuryTime)}
                  </span>
                  <span className="text-base">⚽</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{ev.scorer}</span>
                    {ev.assist && (
                      <span className="text-xs text-muted-foreground">assist: {ev.assist}</span>
                    )}
                  </span>
                  {typeLabel && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">{typeLabel}</Badge>
                  )}
                  {sideBadge}
                </li>
              );
            }

            return (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-10 text-right text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatMinute(ev.minute)}
                </span>
                <span className="text-base">{ev.card === 'RED_CARD' ? '🟥' : '🟨'}</span>
                <span className="text-xs text-muted-foreground shrink-0">{ev.card === 'RED_CARD' ? 'Red' : 'Yellow'}</span>
                <span className="flex-1 truncate">{ev.player}</span>
                {sideBadge}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
