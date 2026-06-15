'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LivePoller({ hasLive }: { hasLive: boolean }) {
  const router = useRouter();

  useEffect(() => {
    // Always sync once on mount so data is fresh on every page load
    fetch('/api/matches/sync', { method: 'POST' })
      .then(() => router.refresh())
      .catch(() => {});

    if (!hasLive) return;

    // Continue polling every 60s while a live match exists
    const interval = setInterval(async () => {
      try {
        await fetch('/api/matches/sync', { method: 'POST' });
      } catch {
        // non-fatal
      }
      router.refresh();
    }, 60_000);

    return () => clearInterval(interval);
  }, [hasLive, router]);

  return null;
}
