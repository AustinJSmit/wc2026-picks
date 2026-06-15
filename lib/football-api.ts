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

export interface ApiGoal {
  minute: number;
  injuryTime?: number | null;
  type: 'REGULAR' | 'OWN_GOAL' | 'PENALTY';
  team: { name: string };
  scorer: { name: string };
  assist?: { name: string | null } | null;
}

export interface ApiBooking {
  minute: number;
  team: { name: string };
  player: { name: string };
  card: 'YELLOW_CARD' | 'RED_CARD';
}

export interface ApiMatch {
  id: number;
  homeTeam: { name: string; crest: string };
  awayTeam: { name: string; crest: string };
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
  goals: ApiGoal[];
  bookings: ApiBooking[];
}

export async function fetchMatchDetail(apiId: string): Promise<{ goals: ApiGoal[]; bookings: ApiBooking[] }> {
  const res = await fetch(`${BASE}/matches/${apiId}`, {
    headers: headers(),
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return {
    goals: (data.goals ?? []) as ApiGoal[],
    bookings: (data.bookings ?? []) as ApiBooking[],
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
    goals: m.goals ?? [],
    bookings: m.bookings ?? [],
  }));
}
