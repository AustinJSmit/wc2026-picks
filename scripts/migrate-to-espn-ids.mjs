/**
 * One-time migration: replace API-Football apiId values with ESPN event IDs.
 * Run with: node --env-file=.env.local scripts/migrate-to-espn-ids.mjs
 */
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

const TEAM_ALIASES = {
  'turkiye': 'turkey', 'turkey': 'turkiye',
  'south korea': 'korea republic', 'korea republic': 'south korea',
  'united states': 'usa', 'usa': 'united states', 'usmnt': 'usa',
  'ir iran': 'iran', 'iran': 'ir iran',
  'ivory coast': 'cote d ivoire', 'cote d ivoire': 'ivory coast',
  'cape verde islands': 'cape verde', 'cape verde': 'cape verde islands',
  'bosnia-herzegovina': 'bosnia and herzegovina', 'bosnia and herzegovina': 'bosnia-herzegovina',
};

function normalizeName(s) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function nameMatches(a, b) {
  return a.includes(b) || b.includes(a) || TEAM_ALIASES[a] === b || TEAM_ALIASES[b] === a;
}

const espnEvents = [];
for (const month of ['202606', '202607']) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${month}&limit=100`
  );
  const data = await res.json();
  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0];
    const home = comp?.competitors?.find(c => c.homeAway === 'home');
    const away = comp?.competitors?.find(c => c.homeAway === 'away');
    if (!home || !away) continue;
    espnEvents.push({
      espnId: event.id,
      homeTeam: home.team.displayName,
      awayTeam: away.team.displayName,
      date: new Date(comp.date ?? event.date),
    });
  }
}
console.log(`Fetched ${espnEvents.length} ESPN events`);

const matches = await sql`SELECT id, api_id, espn_id, home_team, away_team, kickoff_at FROM matches ORDER BY kickoff_at`;
console.log(`DB matches: ${matches.length}`);

let updated = 0;
const notFound = [];

for (const match of matches) {
  const espnId = match.espn_id ?? (() => {
    const matchDate = new Date(match.kickoff_at);
    const found = espnEvents.find(e => {
      const diff = Math.abs(e.date - matchDate) / 86400000;
      const normH = normalizeName(e.homeTeam);
      const normA = normalizeName(e.awayTeam);
      const normHome = normalizeName(match.home_team);
      const normAway = normalizeName(match.away_team);
      return diff < 1.5 && nameMatches(normH, normHome) && nameMatches(normA, normAway);
    });
    return found?.espnId ?? null;
  })();

  if (espnId) {
    await sql`UPDATE matches SET api_id = ${espnId}, espn_id = ${espnId} WHERE id = ${match.id}`;
    updated++;
  } else {
    notFound.push(`${match.home_team} vs ${match.away_team} (${match.kickoff_at})`);
  }
}

console.log(`Updated: ${updated} | Not found: ${notFound.length}`);
if (notFound.length) console.log('Not matched:', notFound);
