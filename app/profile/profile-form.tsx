'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User } from '@/db/schema';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

export default function ProfileForm({ user }: { user: User }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState(user.gender ?? '');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError('');
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const ageRaw = form.get('age') as string;

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: (form.get('displayName') as string) || undefined,
        age: ageRaw ? Number(ageRaw) : null,
        gender: gender || null,
        country: (form.get('country') as string) || null,
        favoriteTeam: (form.get('favoriteTeam') as string) || null,
      }),
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
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" defaultValue={user.displayName} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-4">
              Optional — for post-tournament demographic analysis
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input id="age" name="age" type="number" min={5} max={120} defaultValue={user.age ?? ''} placeholder="e.g. 28" />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={(v) => setGender(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" defaultValue={user.country ?? ''} placeholder="e.g. USA" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="favoriteTeam">Favorite team</Label>
                <Input id="favoriteTeam" name="favoriteTeam" defaultValue={user.favoriteTeam ?? ''} placeholder="e.g. Brazil" />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-md">Profile saved!</p>
          )}

          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
