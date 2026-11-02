import type { TournamentDeckResponse } from '@/api/tournaments/useGetTournamentDecks.ts';

export interface TopLeaderDeck {
  leaderCardId: string;
  deckId: string;
  placement: number;
  playerName: string | null;
}

export function getTopLeaderDecks(decks: readonly TournamentDeckResponse[]): TopLeaderDeck[] {
  const rankedDecks = decks
    .filter(({ deck, tournamentDeck }) => deck && (tournamentDeck.placement ?? 0) > 0)
    .sort(
      (a, b) =>
        a.tournamentDeck.placement! - b.tournamentDeck.placement! ||
        a.tournamentDeck.deckId.localeCompare(b.tournamentDeck.deckId),
    );
  const topDecks = new Map<string, TopLeaderDeck>();

  for (const { deck, tournamentDeck } of rankedDecks) {
    if (!deck) continue;

    for (const leaderCardId of [deck.leaderCardId1, deck.leaderCardId2]) {
      if (!leaderCardId || topDecks.has(leaderCardId)) continue;

      topDecks.set(leaderCardId, {
        leaderCardId,
        deckId: deck.id,
        placement: tournamentDeck.placement!,
        playerName: tournamentDeck.meleePlayerUsername,
      });
    }
  }

  return [...topDecks.values()];
}
