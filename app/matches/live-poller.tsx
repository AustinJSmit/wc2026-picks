'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LivePoller({ hasLive }: { hasLive: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!hasLive) return;

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
