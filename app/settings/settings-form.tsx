'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIMEZONES = [
  { value: 'America/Los_Angeles',  label: 'Pacific Time (US)' },
  { value: 'America/Denver',       label: 'Mountain Time (US)' },
  { value: 'America/Chicago',      label: 'Central Time (US)' },
  { value: 'America/New_York',     label: 'Eastern Time (US)' },
  { value: 'America/Anchorage',    label: 'Alaska Time' },
  { value: 'Pacific/Honolulu',     label: 'Hawaii Time' },
  { value: 'America/Bogota',       label: 'Colombia (Bogotá)' },
  { value: 'America/Sao_Paulo',    label: 'Brazil (São Paulo)' },
  { value: 'America/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { value: 'Europe/London',        label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',         label: 'Central European Time' },
  { value: 'Europe/Istanbul',      label: 'Turkey (Istanbul)' },
  { value: 'Europe/Moscow',        label: 'Moscow Time' },
  { value: 'Africa/Cairo',         label: 'Egypt (Cairo)' },
  { value: 'Africa/Johannesburg',  label: 'South Africa (Joburg)' },
  { value: 'Asia/Dubai',           label: 'Gulf Time (Dubai)' },
  { value: 'Asia/Kolkata',         label: 'India Standard Time' },
  { value: 'Asia/Dhaka',           label: 'Bangladesh (Dhaka)' },
  { value: 'Asia/Bangkok',         label: 'Indochina (Bangkok)' },
  { value: 'Asia/Singapore',       label: 'Singapore / Malaysia' },
  { value: 'Asia/Shanghai',        label: 'China Standard Time' },
  { value: 'Asia/Tokyo',           label: 'Japan Standard Time' },
  { value: 'Asia/Seoul',           label: 'Korea Standard Time' },
  { value: 'Australia/Perth',      label: 'W. Australia (Perth)' },
  { value: 'Australia/Sydney',     label: 'E. Australia (Sydney)' },
  { value: 'Pacific/Auckland',     label: 'New Zealand (Auckland)' },
  { value: 'UTC',                  label: 'UTC' },
];

const KNOWN_VALUES = new Set(TIMEZONES.map(t => t.value));

type DarkMode = 'system' | 'light' | 'dark';

const DARK_OPTIONS: { value: DarkMode; label: string; desc: string }[] = [
  { value: 'system', label: 'System', desc: 'Follows your device setting' },
  { value: 'light', label: 'Light', desc: 'Always light' },
  { value: 'dark', label: 'Dark', desc: 'Always dark' },
];

export default function SettingsForm({ timezone: savedTimezone, darkMode: savedDarkMode }: {
  timezone: string | null;
  darkMode: string | null;
}) {
  const [timezone, setTimezone] = useState(savedTimezone ?? '');
  const [darkMode, setDarkMode] = useState<DarkMode>((savedDarkMode as DarkMode) ?? 'system');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!timezone) {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detected);
    }
  }, []);

  function applyThemeLocally(t: DarkMode) {
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.cookie = `theme=${t}; path=/; max-age=${365 * 24 * 3600}; SameSite=Lax`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError('');
    setLoading(true);

    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone, darkMode }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong');
      return;
    }

    applyThemeLocally(darkMode);
    setSaved(true);
  }

  const options = timezone && !KNOWN_VALUES.has(timezone)
    ? [{ value: timezone, label: `${timezone} (detected)` }, ...TIMEZONES]
    : TIMEZONES;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Timezone */}
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

            {/* Appearance */}
            <div className="space-y-1.5">
              <Label>Appearance</Label>
              <p className="text-xs text-muted-foreground">Choose your preferred color theme.</p>
              <div className="flex gap-2">
                {DARK_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDarkMode(opt.value)}
                    className={`flex-1 border rounded-lg px-3 py-2 text-sm text-left transition-colors ${
                      darkMode === opt.value
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </button>
                ))}
              </div>
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
    </div>
  );
}
