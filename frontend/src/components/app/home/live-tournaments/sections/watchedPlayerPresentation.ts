import type { LiveTournamentHomeWatchedMatch } from '../../../../../../../types/TournamentWeekend.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import { getRoundLabel } from '../liveTournamentUtils.ts';

export function getWatchTournamentStatus(entry: LiveTournamentWeekendTournamentEntry) {
  const { status, roundNumber, matchesRemaining } = entry.weekendTournament;
  const round = getRoundLabel(entry);
  if (status === 'finished' || entry.tournament.imported) return 'Finished';
  if (status === 'upcoming') return 'Upcoming';
  if (status !== 'running') return 'Status unavailable';
  if (!round || roundNumber === null) return 'Waiting for round information';

  // The current round can remain selected between rounds, even after all results arrive.
  return `${round} · ${matchesRemaining === 0 ? 'complete' : 'in progress'}`;
}

export function getWatchedResultLabel(match: LiveTournamentHomeWatchedMatch, finished: boolean) {
  switch (match.outcome) {
    case 'win':
      return 'Won';
    case 'loss':
      return 'Lost';
    case 'draw':
      return 'Draw';
    case 'bye':
      return 'Bye';
    default:
      return finished ? 'Not reported' : 'Pending';
  }
}

export function formatPlacement(placement: number) {
  const remainder = placement % 100;
  const suffix =
    remainder >= 11 && remainder <= 13
      ? 'th'
      : (['th', 'st', 'nd', 'rd'][placement % 10] ?? 'th');
  return `${placement}${suffix}`;
}
