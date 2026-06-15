'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function ConfirmModal({ title, message, confirmLabel, destructive, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
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
          <Button
            onClick={onConfirm}
            className={destructive ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanels({ predictionCount, playerCount, allUsers, currentUserId }: {
  predictionCount: number;
  playerCount: number;
  allUsers: { id: number; displayName: string }[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<'resetPreds' | 'fullReset' | 'transfer' | null>(null);
  const [toUserId, setToUserId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const otherUsers = allUsers.filter(u => u.id !== currentUserId);
  const selectedUser = otherUsers.find(u => u.id === Number(toUserId));

  async function handleResetPredictions() {
    setModal(null);
    setLoading(true);
    const res = await fetch('/api/admin/reset-predictions', { method: 'POST' });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setStatus(`✓ Deleted ${data.deleted} prediction${data.deleted !== 1 ? 's' : ''}.`);
      router.refresh();
    } else {
      setStatus(`Error: ${data.error}`);
    }
  }

  async function handleFullReset() {
    setModal(null);
    setLoading(true);
    const res = await fetch('/api/admin/reset', { method: 'POST' });
    setLoading(false);
    if (res.ok) {
      router.push('/matches');
    } else {
      const data = await res.json();
      setStatus(`Error: ${data.error}`);
    }
  }

  async function handleTransfer() {
    setModal(null);
    setLoading(true);
    const res = await fetch('/api/admin/transfer-host', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: Number(toUserId) }),
    });
    if (res.ok) {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } else {
      const data = await res.json();
      setLoading(false);
      setStatus(`Error: ${data.error}`);
    }
  }

  return (
    <div className="space-y-6">
      {status && (
        <p className={`text-sm px-3 py-2 rounded-md ${status.startsWith('Error') ? 'text-destructive bg-destructive/10' : 'text-primary bg-primary/10'}`}>
          {status}
        </p>
      )}
      {loading && (
        <p className="text-sm text-muted-foreground">Working…</p>
      )}

      {/* Reset Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Reset Predictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Delete all player picks. Match schedule and results are not affected.
          </p>
          <p className="text-sm">
            <strong>{predictionCount}</strong> prediction{predictionCount !== 1 ? 's' : ''} across{' '}
            <strong>{playerCount}</strong> player{playerCount !== 1 ? 's' : ''}
          </p>
          <Button
            onClick={() => setModal('resetPreds')}
            disabled={predictionCount === 0 || loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Reset predictions
          </Button>
        </CardContent>
      </Card>

      {/* Full Reset */}
      <Card>
        <CardHeader>
          <CardTitle>New Tournament</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Wipe everything — all matches and all predictions. Use this to start fresh for a new tournament.
            After resetting, visit <strong>/matches</strong> to reload the schedule from ESPN.
          </p>
          <Button
            onClick={() => setModal('fullReset')}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Full reset
          </Button>
        </CardContent>
      </Card>

      {/* Transfer Host */}
      <Card>
        <CardHeader>
          <CardTitle>Transfer Host</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Hand host control to another player. You will lose admin access immediately and be logged out.
          </p>
          {otherUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No other players have joined yet.</p>
          ) : (
            <>
              <Select value={toUserId ?? ''} onValueChange={(v) => setToUserId(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a player…" />
                </SelectTrigger>
                <SelectContent>
                  {otherUsers.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => setModal('transfer')}
                disabled={!toUserId || loading}
                variant="outline"
              >
                Transfer host
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {modal === 'resetPreds' && (
        <ConfirmModal
          title="Delete all predictions?"
          message={`This will permanently delete ${predictionCount} prediction${predictionCount !== 1 ? 's' : ''}. Match data and player accounts are not affected. This cannot be undone.`}
          confirmLabel="Delete all picks"
          destructive
          onConfirm={handleResetPredictions}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'fullReset' && (
        <ConfirmModal
          title="Full reset?"
          message="This will delete ALL matches and ALL predictions. Player accounts are kept. Visit /matches after to reload the schedule. This cannot be undone."
          confirmLabel="Reset everything"
          destructive
          onConfirm={handleFullReset}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'transfer' && selectedUser && (
        <ConfirmModal
          title={`Transfer host to ${selectedUser.displayName}?`}
          message={`${selectedUser.displayName} will become the new host and gain admin access. You will immediately lose host access and be logged out.`}
          confirmLabel="Transfer host"
          onConfirm={handleTransfer}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
