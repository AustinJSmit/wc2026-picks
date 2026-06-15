'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LiveMatchPoller({ isLive }: { isLive: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(async () => {
      try {
        // Sync the match data from ESPN first, then re-render the page
        await fetch('/api/matches/sync', { method: 'POST' });
      } catch {
        // non-fatal
      }
      router.refresh();
    }, 30_000);

    return () => clearInterval(interval);
  }, [isLive, router]);

  return null;
}
