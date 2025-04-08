import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { TournamentDeck } from '../../../../server/db/schema/tournament_deck.ts';
import { getStoredTournamentDecks, isDataStale, storeTournamentDecks } from '@/lib/db.ts';
import { useGetTournament } from './useGetTournament.ts';
import { DeckInformation } from '../../../../server/db/schema/deck_information.ts';
import { Deck } from '../../../../server/db/schema/deck.ts';

export interface TournamentDeckResponse {
  tournamentDeck: TournamentDeck;
  deck: Deck | null;
  deckInformation: DeckInformation | null;
}

export const useGetTournamentDecks = (tournamentId: string | undefined) => {
  // First, get the tournament to check its updatedAt timestamp
  const { data: tournamentData } = useGetTournament(tournamentId);
  const tournamentUpdatedAt = tournamentData?.tournament?.updatedAt;

  return useQuery<{ data: TournamentDeckResponse[] }>({
    queryKey: ['tournament-decks', tournamentId],
    queryFn:
      tournamentId && tournamentUpdatedAt
        ? async () => {
            if (!tournamentId) throw new Error('Tournament ID is required');

            // Try to get cached data first
            const cachedData = await getStoredTournamentDecks(tournamentId);

            // Check if we have valid cached data that's not stale
            if (
              cachedData &&
              tournamentUpdatedAt &&
              !isDataStale(cachedData.fetchedAt, tournamentUpdatedAt)
            ) {
              console.log('Using cached tournament decks data');
              return { data: cachedData.decks };
            }

            // Otherwise fetch from API
            console.log('Fetching fresh tournament decks data');
            const response = await api.tournament[':id']['decks'].$get({
              param: {
                id: tournamentId,
              },
            });
            if (!response.ok) {
              throw new Error('Something went wrong');
            }

            const newData = await response.json();

            // Cache the new data
            await storeTournamentDecks(tournamentId, newData.data);

            return newData;
          }
        : skipToken,
    staleTime: Infinity,
  });
};
