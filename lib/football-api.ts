const BASE = 'https://api.football-data.org/v4';
const WC_CODE = 'WC';

function headers() {
  return { 'X-Auth-Token': process.env.FOOTBALL_API_KEY ?? '' };
}

function normalizeStatus(status: string): string {
  if (status === 'FINISHED') return 'FINISHED';
  if (status === 'IN_PLAY' || status === 'PAUSED' || status === 'LIVE') return 'LIVE';
  return 'SCHEDULED';
}

export interface ApiMatch {
  id: number;
  homeTeam: { name: string };
  awayTeam: { name: string };
  utcDate: string;
  status: string;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

export async function fetchWCMatches(): Promise<ApiMatch[]> {
  const res = await fetch(`${BASE}/competitions/${WC_CODE}/matches`, {
    headers: headers(),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`football-data.org error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return (data.matches as ApiMatch[]).map(m => ({
    ...m,
    status: normalizeStatus(m.status),
  }));
}
