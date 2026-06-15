const BASE = 'https://v3.football.api-sports.io';

function headers() {
  return {
    'x-apisports-key': process.env.API_FOOTBALL_KEY ?? '',
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

export interface ApiTeamStats {
  team: { name: string };
  possession: string | null;
  shotsOnGoal: number | null;
  totalShots: number | null;
  corners: number | null;
  fouls: number | null;
  offsides: number | null;
  yellowCards: number | null;
  redCards: number | null;
  saves: number | null;
  totalPasses: number | null;
  passAccuracy: string | null;
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

export async function fetchMatchStatistics(apiId: string): Promise<[ApiTeamStats, ApiTeamStats] | null> {
  const res = await fetch(`${BASE}/fixtures/statistics?fixture=${apiId}`, {
    headers: headers(),
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const teams: Array<{ team: { name: string }; statistics: Array<{ type: string; value: string | number | null }> }> =
    data.response ?? [];
  if (teams.length < 2) return null;

  const extract = (raw: Array<{ type: string; value: string | number | null }>) => {
    const get = (type: string) => raw.find(s => s.type === type)?.value ?? null;
    return {
      possession: get('Ball Possession') as string | null,
      shotsOnGoal: get('Shots on Goal') as number | null,
      totalShots: get('Total Shots') as number | null,
      corners: get('Corner Kicks') as number | null,
      fouls: get('Fouls') as number | null,
      offsides: get('Offsides') as number | null,
      yellowCards: get('Yellow Cards') as number | null,
      redCards: get('Red Cards') as number | null,
      saves: get('Goalkeeper Saves') as number | null,
      totalPasses: get('Total passes') as number | null,
      passAccuracy: get('Passes %') as string | null,
    };
  };

  return [
    { team: teams[0].team, ...extract(teams[0].statistics) },
    { team: teams[1].team, ...extract(teams[1].statistics) },
  ];
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
