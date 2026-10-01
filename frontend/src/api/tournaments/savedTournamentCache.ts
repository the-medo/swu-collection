import type { SavedTournament } from '../../../../types/UserTournamentSave.ts';

export const savedTournamentKeys = {
  user: (userId?: string) => ['user-tournament-saves', userId] as const,
  mutation: (userId: string | undefined, tournamentId: string) =>
    ['save-tournament', userId, tournamentId] as const,
};

export function patchSavedTournaments(
  current: SavedTournament[],
  tournamentId: string,
  saved: SavedTournament | null,
) {
  const next = current.filter(row => row.tournamentId !== tournamentId);
  if (saved) next.push(saved);
  return next.sort(
    (a, b) =>
      a.tournament.date.localeCompare(b.tournament.date) ||
      a.tournament.name.localeCompare(b.tournament.name),
  );
}
