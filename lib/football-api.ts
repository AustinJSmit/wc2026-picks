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

// ─── ESPN Fixtures (replaces API-Football) ───────────────────────────────────

function normalizeESPNStatus(status: { type: { state: string; completed: boolean } }): string {
  if (status.type.completed) return 'FINISHED';
  if (status.type.state === 'in') return 'LIVE';
  return 'SCHEDULED';
}

export async function fetchESPNFixtures(): Promise<ApiMatch[]> {
  const all: ApiMatch[] = [];
  // WC 2026 runs June 12 – July 19; fetch both months in parallel
  const [junRes, julRes] = await Promise.all([
    fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=202606&limit=100', { next: { revalidate: 0 } }),
    fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=202607&limit=100', { next: { revalidate: 0 } }),
  ]);

  for (const res of [junRes, julRes]) {
    if (!res.ok) continue;
    const data = await res.json();

    for (const event of data.events ?? []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const home = comp.competitors?.find((c: { homeAway: string }) => c.homeAway === 'home');
      const away = comp.competitors?.find((c: { homeAway: string }) => c.homeAway === 'away');
      if (!home || !away) continue;

      const isPre = comp.status?.type?.state === 'pre';
      const parseScore = (s: string | undefined) =>
        !isPre && s != null && s !== '' ? parseInt(s, 10) : null;

      // For group matches altGameNote is "FIFA World Cup, Group A" → "Group A"
      // For knockout matches altGameNote is just "FIFA World Cup"; use season.slug instead
      let stage = (comp.altGameNote ?? '').replace(/^FIFA World Cup,\s*/i, '').trim();
      if (!stage || stage === 'FIFA World Cup') {
        const slug: string = event.season?.slug ?? '';
        const SLUG_LABELS: Record<string, string> = {
          'round-of-32': 'Round of 32',
          'round-of-16': 'Round of 16',
          'quarterfinals': 'Quarterfinal',
          'semifinals': 'Semifinal',
          'third-place': '3rd Place Match',
          'final': 'Final',
        };
        stage = SLUG_LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }

      all.push({
        id: parseInt(event.id, 10),
        homeTeam: { name: home.team.displayName, crest: home.team.logo ?? '' },
        awayTeam: { name: away.team.displayName, crest: away.team.logo ?? '' },
        utcDate: comp.date ?? event.date,
        status: normalizeESPNStatus(comp.status),
        stage,
        group: null,
        score: { fullTime: { home: parseScore(home.score), away: parseScore(away.score) } },
        goals: [],
        bookings: [],
      });
    }
  }

  if (all.length === 0) throw new Error('ESPN scoreboard returned no fixtures');
  return all;
}

// ─── ESPN Match Detail ────────────────────────────────────────────────────────

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
    const clockDisplay: string = evt.clock?.displayValue ?? '';
    const injuryMatch = clockDisplay.match(/(\d+)['']?\+(\d+)/);
    const minute = injuryMatch ? parseInt(injuryMatch[1], 10) : (parseInt(clockDisplay, 10) || 0);
    const injuryTime = injuryMatch ? parseInt(injuryMatch[2], 10) : null;
    const teamName: string = evt.team?.displayName ?? '';

    const isGoal = typeStr === 'goal' || typeStr.startsWith('goal---') || typeStr === 'penalty---scored' || typeStr === 'own-goal';
    if (isGoal) {
      const scorer: string = evt.participants?.[0]?.athlete?.displayName ?? '';
      const assistRaw: string | null = evt.participants?.[1]?.athlete?.displayName ?? null;
      const goalType = typeStr === 'penalty---scored' || evt.penaltyKick
        ? 'PENALTY'
        : typeStr === 'own-goal' || evt.ownGoal
        ? 'OWN_GOAL'
        : 'REGULAR';
      goals.push({
        minute,
        injuryTime,
        type: goalType,
        team: { name: teamName },
        scorer: { name: scorer },
        assist: assistRaw ? { name: assistRaw } : null,
      });
    } else if (typeStr === 'yellow-card' || typeStr === 'red-card' || typeStr === 'var---red-card-upgrade') {
      const player: string = evt.participants?.[0]?.athlete?.displayName ?? '';
      bookings.push({
        minute,
        team: { name: teamName },
        player: { name: player },
        card: typeStr === 'yellow-card' ? 'YELLOW_CARD' : 'RED_CARD',
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
    statistics = [parseStats(homeComp?.statistics, homeTeamName), parseStats(awayComp?.statistics, awayTeamName)];
  }

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

  const gameInfo = data.gameInfo ?? {};
  const venueParts = [gameInfo.venue?.fullName, gameInfo.venue?.address?.city].filter(Boolean);
  const venue = venueParts.length > 0 ? venueParts.join(', ') : null;
  const attendance: number | null = typeof gameInfo.attendance === 'number' ? gameInfo.attendance : null;

  return { goals, bookings, statistics, lineups, venue, attendance };
}

// ─── ESPN Group Standings ─────────────────────────────────────────────────────

export async function fetchGroupStandings(groupName: string): Promise<ApiStandingEntry[] | null> {
  const res = await fetch(
    'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings',
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) return null;
  const data = await res.json();

  type EspnGroup = { name: string; standings: { entries: EspnEntry[] } };
  type EspnEntry = { team: { id: string; displayName: string; logos: { href: string }[] }; stats: { name: string; value: number }[] };

  const group: EspnGroup | undefined = (data.children ?? []).find((g: EspnGroup) => g.name === groupName);
  if (!group) return null;

  return (group.standings?.entries ?? []).map((entry) => {
    const stat = (name: string) => Math.round(entry.stats?.find((s) => s.name === name)?.value ?? 0);
    return {
      rank: stat('rank'),
      group: groupName,
      team: {
        id: parseInt(entry.team.id, 10),
        name: entry.team.displayName,
        logo: entry.team.logos?.[0]?.href ?? '',
      },
      points: stat('points'),
      goalsDiff: Math.round(entry.stats?.find((s) => s.name === 'pointDifferential')?.value ?? 0),
      all: {
        played: stat('gamesPlayed'),
        win: stat('wins'),
        draw: stat('ties'),
        lose: stat('losses'),
        goals: { for: stat('pointsFor'), against: stat('pointsAgainst') },
      },
      form: '',
    };
  });
}
