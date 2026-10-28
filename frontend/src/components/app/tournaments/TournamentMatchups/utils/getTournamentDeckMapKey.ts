export const getTournamentDeckMapKey = (tournamentId: string, deckId: string | null) =>
  `${tournamentId}:${deckId}`;
