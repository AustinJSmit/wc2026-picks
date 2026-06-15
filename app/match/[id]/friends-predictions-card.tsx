'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FriendPick {
  displayName: string;
  predHome: number;
  predAway: number;
  points: number | null;
  homeTeam: string;
  awayTeam: string;
  homeTeamCrest: string | null;
  awayTeamCrest: string | null;
}

export default function FriendsPredictionsCard({ matchId }: { matchId: number }) {
  const [picks, setPicks] = useState<FriendPick[] | null>(null);

  useEffect(() => {
    fetch(`/api/predictions?matchId=${matchId}`)
      .then(r => r.json())
      .then(data => setPicks(Array.isArray(data) ? data : []))
      .catch(() => setPicks([]));
  }, [matchId]);

  if (picks === null) return null; // loading
  if (picks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Everyone&apos;s Picks</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {picks.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="flex-1 font-medium truncate">{p.displayName}</span>
              <div className="flex items-center gap-1 shrink-0">
                {p.homeTeamCrest
                  ? <img src={p.homeTeamCrest} alt={p.homeTeam} className="h-4 w-4 object-contain" />
                  : <span className="text-[10px] text-muted-foreground">{p.homeTeam.slice(0, 3).toUpperCase()}</span>
                }
                <span className="font-bold tabular-nums">{p.predHome} – {p.predAway}</span>
                {p.awayTeamCrest
                  ? <img src={p.awayTeamCrest} alt={p.awayTeam} className="h-4 w-4 object-contain" />
                  : <span className="text-[10px] text-muted-foreground">{p.awayTeam.slice(0, 3).toUpperCase()}</span>
                }
              </div>
              {p.points != null && (
                <Badge
                  variant={p.points > 0 ? 'default' : 'secondary'}
                  className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                >
                  {p.points === 2 ? '🎯' : p.points === 1 ? '✅' : '❌'} {p.points}pt
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
