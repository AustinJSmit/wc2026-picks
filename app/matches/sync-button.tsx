'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface DetailResult {
  apiId: string;
  status: 'ok' | 'error';
  goalsFound: number;
  valid?: boolean;
  error?: string;
}

export default function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState('');

  async function handleSync() {
    setLoading(true);
    setStatus('');
    setDetail('');
    const res = await fetch('/api/matches/sync', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      const failNote = data.failed ? `, ${data.failed} failed` : '';
      setStatus(`✓ ${data.matchesSynced} matches synced${failNote}`);

      // Build diagnostic line
      const parts: string[] = [];
      if (data.goalsFromCompetitionEndpoint > 0) {
        parts.push(`${data.goalsFromCompetitionEndpoint} matches had goals in API`);
      }
      if (data.detailResults?.length > 0) {
        const results = data.detailResults as DetailResult[];
        const ok = results.filter(r => r.status === 'ok');
        const errors = results.filter(r => r.status === 'error');
        const withGoals = ok.filter(r => r.goalsFound > 0 && r.valid !== false);
        const invalid = ok.filter(r => r.valid === false);
        if (withGoals.length > 0) parts.push(`${withGoals.length} event lookup(s) got goals`);
        if (invalid.length > 0) parts.push(`${invalid.length} match(es): API returned wrong fixture data`);
        if (errors.length > 0) parts.push(`${errors.length} event lookup error(s): ${errors[0].error}`);
        if (ok.length > 0 && withGoals.length === 0 && invalid.length === 0) parts.push(`${ok.length} event lookups: API returned no goals`);
      }
      if (parts.length > 0) setDetail(parts.join(' · '));

      router.refresh();
    } else {
      setStatus(`Error: ${data.error}`);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {status && <span className="text-xs text-muted-foreground">{status}</span>}
        <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
          {loading ? 'Syncing…' : '🔄 Sync results'}
        </Button>
      </div>
      {detail && <span className="text-[10px] text-muted-foreground max-w-xs text-right">{detail}</span>}
    </div>
  );
}
