'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function CreateLobbyForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.get('name') }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      return;
    }

    router.push('/matches');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create a lobby</CardTitle>
        <CardDescription>Start a new private group and invite friends with a code.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lobby-name">Lobby name</Label>
            <Input id="lobby-name" name="name" placeholder="e.g. College Friends" required />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating…' : 'Create lobby'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function JoinLobbyForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/lobbies/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: form.get('code') }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      return;
    }

    router.push('/matches');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Join a lobby</CardTitle>
        <CardDescription>Enter a code someone shared with you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="lobby-code">Lobby code</Label>
            <Input id="lobby-code" name="code" placeholder="e.g. AB3XYZ" className="font-mono uppercase" required />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}
          <Button type="submit" variant="outline" className="w-full" disabled={loading}>
            {loading ? 'Joining…' : 'Join lobby'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SwitchLobbyButton({ lobbyId, isCurrent }: { lobbyId: number; isCurrent: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSwitch() {
    setLoading(true);
    const res = await fetch('/api/lobbies/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobbyId }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/matches');
      router.refresh();
    }
  }

  if (isCurrent) {
    return (
      <span className="text-xs font-medium text-primary shrink-0 px-2.5 py-1.5">Current</span>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={handleSwitch} disabled={loading} className="shrink-0">
      {loading ? 'Switching…' : 'Switch'}
    </Button>
  );
}
