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
  const [createdLobby, setCreatedLobby] = useState<{ name: string; code: string } | null>(null);

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

    setCreatedLobby({ name: data.lobby.name, code: data.lobby.code });
  }

  function handleContinue() {
    router.push('/matches');
    router.refresh();
  }

  if (createdLobby) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{createdLobby.name} is ready</CardTitle>
          <CardDescription>Share this code with friends so they can join.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border bg-muted/30">
            <span className="text-2xl font-mono tracking-widest">{createdLobby.code}</span>
            <CopyCodeButton code={createdLobby.code} />
          </div>
          <Button onClick={handleContinue} className="w-full">Continue to matches</Button>
        </CardContent>
      </Card>
    );
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

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
      {copied ? 'Copied!' : 'Copy code'}
    </Button>
  );
}

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card text-card-foreground border rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h2 className="font-bold text-lg">⚠️ {title}</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LobbyRowActions({ lobbyId, lobbyName, isHost }: { lobbyId: number; lobbyName: string; isHost: boolean }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setShowConfirm(false);
    setLoading(true);
    const res = await fetch(isHost ? '/api/lobbies/delete' : '/api/lobbies/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lobbyId }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Something went wrong');
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="shrink-0 text-destructive hover:text-destructive"
      >
        {isHost ? 'Delete' : 'Leave'}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {showConfirm && (
        <ConfirmModal
          title={isHost ? `Delete "${lobbyName}"?` : `Leave "${lobbyName}"?`}
          message={
            isHost
              ? `This permanently deletes "${lobbyName}" and all its predictions for every member. This cannot be undone.`
              : `You'll need the join code to get back in.`
          }
          confirmLabel={isHost ? 'Delete lobby' : 'Leave lobby'}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
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
