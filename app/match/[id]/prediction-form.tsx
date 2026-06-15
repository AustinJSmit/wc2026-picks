'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { parseSpeech } from '@/lib/speech';

interface Props {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  existing: { home: number; away: number } | null;
}

export default function PredictionForm({ matchId, homeTeam, awayTeam, existing }: Props) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(existing?.home?.toString() ?? '');
  const [awayScore, setAwayScore] = useState(existing?.away?.toString() ?? '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser. Try Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      for (let i = 0; i < event.results[0].length; i++) {
        const transcript = event.results[0][i].transcript;
        const parsed = parseSpeech(transcript);
        if (parsed) {
          setHomeScore(String(parsed.home));
          setAwayScore(String(parsed.away));
          setError('');
          return;
        }
      }
      setError('Could not understand the score — try saying "2 1" or "two one"');
    };

    recognition.onerror = () => {
      setListening(false);
      setError('Voice recognition error — please type your prediction instead');
    };

    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setLoading(true);

    const predHome = parseInt(homeScore, 10);
    const predAway = parseInt(awayScore, 10);

    if (isNaN(predHome) || isNaN(predAway)) {
      setError('Please enter a valid score for both teams');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, predHome, predAway }),
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-muted-foreground text-center">
        Say or type your predicted score:
      </p>

      <div className="flex items-center gap-4 justify-center">
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{homeTeam}</p>
          <Input
            type="number"
            min={0}
            max={99}
            value={homeScore}
            onChange={e => setHomeScore(e.target.value)}
            className="w-20 text-center text-2xl font-bold h-14"
            placeholder="0"
            required
          />
        </div>
        <span className="text-2xl font-light text-muted-foreground mt-5">–</span>
        <div className="text-center space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{awayTeam}</p>
          <Input
            type="number"
            min={0}
            max={99}
            value={awayScore}
            onChange={e => setAwayScore(e.target.value)}
            className="w-20 text-center text-2xl font-bold h-14"
            placeholder="0"
            required
          />
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant={listening ? 'destructive' : 'outline'}
          size="sm"
          onClick={listening ? stopListening : startListening}
          className="gap-2"
        >
          {listening ? '⏹ Stop listening' : '🎙 Dictate score'}
        </Button>
      </div>

      {listening && (
        <p className="text-center text-sm text-primary animate-pulse">
          Listening… say the score, e.g. &quot;two one&quot;
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md text-center">{error}</p>
      )}
      {saved && (
        <p className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-md text-center">
          ✅ Prediction saved!
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving…' : existing ? 'Update prediction' : 'Submit prediction'}
      </Button>
    </form>
  );
}
