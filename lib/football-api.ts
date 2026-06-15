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

export interface ApiLineupPlayer {
  name: string;
  jersey: number | null;
  position: string | null;
}

export interface ApiLineup {
  formation: string | null;
  starters: ApiLineupPlayer[];
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

// Raw shape from API-Football fixtures endpoint
interface AfFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string | null };
  teams: { home: { name: string; logo: string }; away: { name: string; logo: string } };
  goals: { home: number | null; away: number | null };
}

function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

export async function findESPNEventId(
  date: Date,
  homeTeam: string,
  awayTeam: string,
): Promise<string | null> {
  const normHome = normalizeName(homeTeam);
  const normAway = normalizeName(awayTeam);

  // Try day-before, same day, and day-after to handle UTC/local-time boundary mismatches
  for (const offset of [-1, 0, 1]) {
    const d = new Date(date.getTime() + offset * 86400000);
    const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, '');
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${yyyymmdd}&limit=50`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) continue;
    const data = await res.json();

    for (const event of data.events ?? []) {
      const comps: Array<{ team: { displayName: string }; homeAway: string }> =
        event.competitions?.[0]?.competitors ?? [];
      const home = comps.find((c) => c.homeAway === 'home');
      const away = comps.find((c) => c.homeAway === 'away');
      if (!home || !away) continue;
      const normH = normalizeName(home.team.displayName);
      const normA = normalizeName(away.team.displayName);
      // Substring match handles "Turkiye"↔"Turkey", "Korea Republic"↔"South Korea", etc.
      if (
        (normH.includes(normHome) || normHome.includes(normH)) &&
        (normA.includes(normAway) || normAway.includes(normA))
      ) {
        return String(event.id);
      }
    }
  }
  return null;
}

export async function fetchESPNMatchDetail(espnId: string): Promise<{
  goals: ApiGoal[];
  bookings: ApiBooking[];
  statistics: [ApiTeamStats, ApiTeamStats] | null;
  lineups: [ApiLineup, ApiLineup] | null;
  venue: string | null;
  attendance: number | null;
}> {
  const empty = { goals: [], bookings: [], statistics: null, lineups: null, venue: null, attendance: null };
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnId}`,
    { next: { revalidate: 0 } },
  );
  if (!res.ok) return empty;
  const data = await res.json();

  const comps = data.header?.competitions?.[0] ?? data.competitions?.[0];
  const homeComp = comps?.competitors?.find((c: { homeAway: string }) => c.homeAway === 'home');
  const awayComp = comps?.competitors?.find((c: { homeAway: string }) => c.homeAway === 'away');
  const homeTeamName: string = homeComp?.team?.displayName ?? '';
  const awayTeamName: string = awayComp?.team?.displayName ?? '';

  const goals: ApiGoal[] = [];
  const bookings: ApiBooking[] = [];

  for (const evt of data.keyEvents ?? []) {
    const typeStr: string = evt.type?.type ?? '';
    const minuteStr: string = evt.clock?.displayValue ?? '';
    const minute = parseInt(minuteStr, 10) || 0;
    const teamName: string = evt.team?.displayName ?? '';

    if (typeStr === 'goal') {
      const scorer: string = evt.participants?.[0]?.athlete?.displayName ?? '';
      const assistRaw: string | null = evt.participants?.[1]?.athlete?.displayName ?? null;
      goals.push({
        minute,
        injuryTime: null,
        type: evt.penaltyKick ? 'PENALTY' : evt.ownGoal ? 'OWN_GOAL' : 'REGULAR',
        team: { name: teamName },
        scorer: { name: scorer },
        assist: assistRaw ? { name: assistRaw } : null,
      });
    } else if (typeStr === 'yellow-card' || typeStr === 'red-card') {
      const player: string = evt.athletesInvolved?.[0]?.displayName ?? '';
      bookings.push({
        minute,
        team: { name: teamName },
        player: { name: player },
        card: evt.redCard ? 'RED_CARD' : 'YELLOW_CARD',
      });
    }
  }

  type EspnStatArr = Array<{ name: string; displayValue: string }>;
  function parseStats(statsArr: EspnStatArr | undefined, teamName: string): ApiTeamStats {
    const stats: EspnStatArr = statsArr ?? [];
    const findNum = (key: string) => {
      const v = stats.find((s) => s.name === key)?.displayValue ?? null;
      return v == null ? null : parseFloat(v) || null;
    };
    const findStr = (key: string) => stats.find((s) => s.name === key)?.displayValue ?? null;
    return {
      team: { name: teamName },
      possession: findStr('possessionPct'),
      shotsOnGoal: findNum('shotsOnTarget'),
      totalShots: findNum('totalShots'),
      corners: findNum('wonCorners'),
      fouls: findNum('foulsCommitted'),
      offsides: findNum('offsides'),
      yellowCards: findNum('yellowCards'),
      redCards: findNum('redCards'),
      saves: findNum('saves'),
      totalPasses: findNum('totalPasses'),
      passAccuracy: findStr('passPct'),
    };
  }

  // Prefer boxscore.teams (has all 28 stats including yellow/red cards, saves, offsides, passes)
  type BsTeam = { homeAway: string; team: { displayName: string }; statistics?: EspnStatArr };
  const bsTeams: BsTeam[] = data.boxscore?.teams ?? [];
  const homeBS = bsTeams.find((t) => t.homeAway === 'home');
  const awayBS = bsTeams.find((t) => t.homeAway === 'away');

  let statistics: [ApiTeamStats, ApiTeamStats] | null = null;
  if (homeBS?.statistics?.length || awayBS?.statistics?.length) {
    statistics = [
      parseStats(homeBS?.statistics, homeBS?.team?.displayName ?? homeTeamName),
      parseStats(awayBS?.statistics, awayBS?.team?.displayName ?? awayTeamName),
    ];
  } else if (homeComp?.statistics?.length || awayComp?.statistics?.length) {
    // Fall back to header competitors stats (fewer fields, but better than nothing)
    statistics = [parseStats(homeComp?.statistics, homeTeamName), parseStats(awayComp?.statistics, awayTeamName)];
  }

  // Parse starting lineups from rosters
  type EspnPlayer = { starter: boolean; athlete: { displayName: string; jersey: string; position?: { displayName: string } } };
  type EspnRoster = { homeAway: string; formation?: string; roster?: EspnPlayer[] };
  const rosters: EspnRoster[] = data.rosters ?? [];
  function parseLineup(homeAway: 'home' | 'away'): ApiLineup | null {
    const roster = rosters.find((r) => r.homeAway === homeAway);
    if (!roster) return null;
    const starters = (roster.roster ?? [])
      .filter((p) => p.starter)
      .map((p) => ({
        name: p.athlete.displayName,
        jersey: parseInt(p.athlete.jersey, 10) || null,
        position: p.athlete.position?.displayName ?? null,
      }));
    if (starters.length === 0) return null;
    return { formation: roster.formation ?? null, starters };
  }
  const homeLineup = parseLineup('home');
  const awayLineup = parseLineup('away');
  const lineups: [ApiLineup, ApiLineup] | null =
    homeLineup && awayLineup ? [homeLineup, awayLineup] : null;

  // Parse venue and attendance
  const gameInfo = data.gameInfo ?? {};
  const venueParts = [gameInfo.venue?.fullName, gameInfo.venue?.address?.city].filter(Boolean);
  const venue = venueParts.length > 0 ? venueParts.join(', ') : null;
  const attendance: number | null = typeof gameInfo.attendance === 'number' ? gameInfo.attendance : null;

  return { goals, bookings, statistics, lineups, venue, attendance };
}

export interface ApiStandingEntry {
  rank: number;
  group: string;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  all: {
    played: number; win: number; draw: number; lose: number;
    goals: { for: number; against: number };
  };
  form: string;
}

export async function fetchGroupStandings(groupName: string): Promise<ApiStandingEntry[] | null> {
  const res = await fetch(`${BASE}/standings?league=1&season=2026`, {
    headers: headers(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const allGroups: ApiStandingEntry[][] = data.response?.[0]?.league?.standings ?? [];
  return allGroups.find(g => g[0]?.group === groupName) ?? null;
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
