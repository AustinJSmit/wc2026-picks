'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  async function handleSync() {
    setLoading(true);
    setStatus('');
    const res = await fetch('/api/matches/sync', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setStatus(`✓ ${data.matchesSynced} matches synced`);
      router.refresh();
    } else {
      setStatus(`Error: ${data.error}`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status && <span className="text-xs text-muted-foreground">{status}</span>}
      <Button variant="outline" size="sm" onClick={handleSync} disabled={loading}>
        {loading ? 'Syncing…' : '🔄 Sync results'}
      </Button>
    </div>
  );
}
