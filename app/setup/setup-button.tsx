'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function SetupButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSetup() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Setup failed. Check your DATABASE_URL.');
        setLoading(false);
        return;
      }
      router.push('/signup');
    } catch {
      setError('Network error — check your connection and try again.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleSetup} disabled={loading} className="w-full">
        {loading ? 'Initializing…' : 'Initialize Database'}
      </Button>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md text-left">{error}</p>
      )}
    </div>
  );
}
