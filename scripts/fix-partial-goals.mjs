/**
 * Re-fetch goals for matches where stored goal count < expected.
 * Run with: node --env-file=.env.local scripts/fix-partial-goals.mjs
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function fetchESPNMatchDetail(espnId) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnId}`
  );
  if (!res.ok) return null;
  const data = await res.json();

  const goals = [];
  const bookings = [];

  for (const evt of data.keyEvents ?? []) {
    const typeStr = evt.type?.type ?? '';
    const clockDisplay = evt.clock?.displayValue ?? '';
    const injuryMatch = clockDisplay.match(/(\d+)[''']?\+(\d+)/);
    const minute = injuryMatch ? parseInt(injuryMatch[1], 10) : (parseInt(clockDisplay, 10) || 0);
    const injuryTime = injuryMatch ? parseInt(injuryMatch[2], 10) : null;
    const teamName = evt.team?.displayName ?? '';

    // Match goal, goal---header, goal---volley, penalty---scored, own-goal
    const isGoal = typeStr === 'goal' || typeStr.startsWith('goal---') || typeStr === 'penalty---scored' || typeStr === 'own-goal';
    if (isGoal) {
      const scorer = evt.participants?.[0]?.athlete?.displayName ?? '';
      const assistRaw = evt.participants?.[1]?.athlete?.displayName ?? null;
      const goalType = typeStr === 'penalty---scored' || evt.penaltyKick
        ? 'PENALTY'
        : typeStr === 'own-goal' || evt.ownGoal
        ? 'OWN_GOAL'
        : 'REGULAR';
      goals.push({ minute, injuryTime, type: goalType, team: { name: teamName }, scorer: { name: scorer }, assist: assistRaw ? { name: assistRaw } : null });
    } else if (typeStr === 'yellow-card' || typeStr === 'red-card') {
      const player = evt.athletesInvolved?.[0]?.displayName ?? '';
      bookings.push({ minute, team: { name: teamName }, player: { name: player }, card: typeStr === 'red-card' ? 'RED_CARD' : 'YELLOW_CARD' });
    }
  }

  return { goals, bookings };
}

const rows = await sql`
  SELECT id, api_id, home_team, away_team, home_score, away_score
  FROM matches
  WHERE status = 'FINISHED' AND goals IS NULL
`;

console.log(`Found ${rows.length} matches with NULL goals`);

let fixed = 0;
let failed = 0;

for (const match of rows) {
  if (!match.api_id) continue;
  const expected = (match.home_score ?? 0) + (match.away_score ?? 0);

  const detail = await fetchESPNMatchDetail(match.api_id);
  if (!detail) {
    console.log(`  [ERROR] ${match.home_team} vs ${match.away_team} - fetch failed`);
    failed++;
    continue;
  }

  const got = detail.goals.length;
  const ok = expected === 0 || got > 0;

  if (ok) {
    await sql`
      UPDATE matches SET goals = ${JSON.stringify(detail.goals)}::jsonb, bookings = ${detail.bookings.length > 0 ? JSON.stringify(detail.bookings) : null}::jsonb
      WHERE id = ${match.id}
    `;
    console.log(`  [OK] ${match.home_team} vs ${match.away_team}: stored ${got}/${expected} goals`);
    fixed++;
  } else {
    console.log(`  [SKIP] ${match.home_team} vs ${match.away_team}: ESPN returned 0 goals, expected ${expected}`);
    failed++;
  }
}

console.log(`\nDone: fixed=${fixed}, failed=${failed}`);
