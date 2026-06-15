const BASE = 'https://api-football-v1.p.rapidapi.com/v3';

function headers() {
  return {
    'X-RapidAPI-Key': process.env.API_FOOTBALL_KEY ?? '',
    'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
  };
}

function normalizeStatus(status: string): string {
  if (['FT', 'AET', 'PEN'].includes(status)) return 'FINISHED';
  if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT', 'LIVE'].includes(status)) return 'LIVE';
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

// Raw shapes from API-Football
interface AfEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string };
  player: { id: number | null; name: string };
  assist: { id: number | null; name: string | null } | null;
  type: string;
  detail: string;
}

interface AfFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string | null };
  teams: { home: { name: string; logo: string }; away: { name: string; logo: string } };
  goals: { home: number | null; away: number | null };
}

export async function fetchMatchDetail(apiId: string): Promise<{ goals: ApiGoal[]; bookings: ApiBooking[] }> {
  const res = await fetch(`${BASE}/fixtures/events?fixture=${apiId}`, {
    headers: headers(),
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const events: AfEvent[] = data.response ?? [];

  const goals: ApiGoal[] = events
    .filter(e => e.type === 'Goal')
    .map(e => ({
      minute: e.time.elapsed,
      injuryTime: e.time.extra ?? null,
      type: e.detail === 'Own Goal' ? 'OWN_GOAL' : e.detail === 'Penalty' ? 'PENALTY' : 'REGULAR',
      team: { name: e.team.name },
      scorer: { name: e.player.name },
      assist: e.assist?.name ? { name: e.assist.name } : null,
    }));

  const bookings: ApiBooking[] = events
    .filter(e => e.type === 'Card')
    .map(e => ({
      minute: e.time.elapsed,
      team: { name: e.team.name },
      player: { name: e.player.name },
      card: e.detail === 'Red Card' ? 'RED_CARD' : 'YELLOW_CARD',
    }));

  return { goals, bookings };
}

export async function fetchWCMatches(): Promise<ApiMatch[]> {
  const res = await fetch(`${BASE}/fixtures?league=1&season=2026`, {
    headers: headers(),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API-Football error: ${res.status} ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.response as AfFixture[]).map(f => ({
    id: f.fixture.id,
    homeTeam: { name: f.teams.home.name, crest: f.teams.home.logo },
    awayTeam: { name: f.teams.away.name, crest: f.teams.away.logo },
    utcDate: f.fixture.date,
    status: normalizeStatus(f.fixture.status.short),
    stage: f.league.round ?? '',
    group: null,
    score: { fullTime: { home: f.goals.home ?? null, away: f.goals.away ?? null } },
    goals: [],
    bookings: [],
  }));
}
