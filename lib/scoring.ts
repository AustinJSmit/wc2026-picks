import type { Match, Prediction } from '@/db/schema';

function winner(home: number, away: number): 'home' | 'away' | 'draw' {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

export function calculatePoints(
  prediction: Pick<Prediction, 'predHome' | 'predAway'>,
  match: Pick<Match, 'homeScore' | 'awayScore' | 'status'>
): number | null {
  if (match.status !== 'FINISHED' || match.homeScore == null || match.awayScore == null) {
    return null;
  }

  let points = 0;

  if (winner(prediction.predHome, prediction.predAway) === winner(match.homeScore, match.awayScore)) {
    points += 1;
  }

  if (prediction.predHome === match.homeScore && prediction.predAway === match.awayScore) {
    points += 1;
  }

  return points;
}
