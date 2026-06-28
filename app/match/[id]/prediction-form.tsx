'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Props {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  existing: { home: number; away: number } | null;
  isKnockout?: boolean;
}

export default function PredictionForm({ matchId, homeTeam, awayTeam, existing, isKnockout }: Props) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(existing?.home?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(existing?.away?.toString() ?? '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setLoading(true);

    const predHome = parseInt(homeScore, 10);
    const predAway = parseInt(awayScore, 10);

    if (isNaN(predHome) || isNaN(predAway)) {
      setError('Please enter a valid score for both teams');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, predHome, predAway }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-muted-foreground text-center">
        Enter your predicted score:
      </p>

      <div className="flex items-center gap-4 justify-center">
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{homeTeam}</p>
          <Input
            type="number"
            min={0}
            max={99}
            value={homeScore}
            onChange={e => setHomeScore(e.target.value)}
            className="w-20 text-center text-2xl font-bold h-14"
            placeholder="0"
            required
          />
        </div>
        <span className="text-2xl font-light text-muted-foreground mt-5">–</span>
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{awayTeam}</p>
          <Input
            type="number"
            min={0}
            max={99}
            value={awayScore}
            onChange={e => setAwayScore(e.target.value)}
            className="w-20 text-center text-2xl font-bold h-14"
            placeholder="0"
            required
          />
        </div>
      </div>

      {isKnockout && (
        <p className="text-xs text-muted-foreground text-center border border-border rounded-md px-3 py-2">
          Knockout match — if it goes to penalties, your pick is scored on the result after extra time, not the shootout.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md text-center">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-md text-center">
          ✅ Prediction saved!
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving…' : existing ? 'Update prediction' : 'Submit prediction'}
      </Button>
    </form>
  );
}
