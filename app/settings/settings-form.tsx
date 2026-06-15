'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (US — Los Angeles)' },
  { value: 'America/Denver', label: 'Mountain Time (US — Denver)' },
  { value: 'America/Chicago', label: 'Central Time (US — Chicago)' },
  { value: 'America/New_York', label: 'Eastern Time (US — New York)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'America/Bogota', label: 'Colombia Time (Bogotá)' },
  { value: 'America/Sao_Paulo', label: 'Brasília Time (São Paulo)' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time (Buenos Aires)' },
  { value: 'Europe/London', label: 'London (GMT / BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris, Berlin, Rome)' },
  { value: 'Europe/Istanbul', label: 'Turkey Time (Istanbul)' },
  { value: 'Europe/Moscow', label: 'Moscow Time' },
  { value: 'Africa/Cairo', label: 'Egypt Time (Cairo)' },
  { value: 'Africa/Johannesburg', label: 'South Africa Time (Johannesburg)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
  { value: 'Asia/Dhaka', label: 'Bangladesh Time (Dhaka)' },
  { value: 'Asia/Bangkok', label: 'Indochina Time (Bangkok)' },
  { value: 'Asia/Singapore', label: 'Singapore / Malaysia Time' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (Seoul)' },
  { value: 'Australia/Perth', label: 'Western Australia (Perth)' },
  { value: 'Australia/Sydney', label: 'Eastern Australia (Sydney)' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time (Auckland)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

const KNOWN_VALUES = new Set(TIMEZONES.map(t => t.value));

export default function SettingsForm({ timezone: savedTimezone }: { timezone: string | null }) {
  const [timezone, setTimezone] = useState(savedTimezone ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!timezone) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detected);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError('');
    setLoading(true);

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      return;
    }

    setSaved(true);
  }

  // If the saved/detected timezone isn't in the curated list, add it at the top
  const options = timezone && !KNOWN_VALUES.has(timezone)
    ? [{ value: timezone, label: `${timezone} (detected)` }, ...TIMEZONES]
    : TIMEZONES;

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <p className="text-xs text-muted-foreground">
              Kickoff times across the app will display in this timezone.
            </p>
            <Select value={timezone} onValueChange={(v) => setTimezone(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a timezone…" />
              </SelectTrigger>
              <SelectContent>
                {options.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-md">Settings saved!</p>
          )}

          <Button type="submit" disabled={loading || !timezone}>
            {loading ? 'Saving…' : 'Save settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
