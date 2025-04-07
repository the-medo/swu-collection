import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { TournamentDeck } from '../../../../server/db/schema/tournament_deck.ts';
import { DeckInformation } from '../../../../server/db/schema/deck_information.ts';
import { Deck } from '../../../../server/db/schema/deck.ts';

export interface TournamentDeckResponse {
  tournamentDeck: TournamentDeck;
  deck: Deck | null;
  deckInformation: DeckInformation | null;
}

export const useGetTournamentDecks = (tournamentId: string | undefined) => {
  return useQuery<{ data: TournamentDeckResponse[] }>({
    queryKey: ['tournament-decks', tournamentId],
    queryFn: tournamentId
      ? async () => {
          const response = await api.tournament[':id']['decks'].$get({
            param: {
              id: tournamentId,
            },
          });
          if (!response.ok) {
            throw new Error('Something went wrong');
          }
          return response.json();
        }
      : skipToken,
    staleTime: Infinity,
  });
};
