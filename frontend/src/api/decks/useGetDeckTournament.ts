import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { TournamentMatch } from '../../../../server/db/schema/tournament_match.ts';
import { TournamentDeck } from '../../../../server/db/schema/tournament_deck.ts';
import { TournamentStringDate } from '../../../../types/Tournament.ts';
import { Deck } from '../../../../types/Deck.ts';
import { DeckInformation } from '../../../../server/db/schema/deck_information.ts';

export interface DeckTournamentMatch {
  match: TournamentMatch;
  opponentDeck: Deck | null;
  opponentDeckInfo: DeckInformation | null;
}

export type DeckTournamentResponse = {
  data: {
    tournament: TournamentStringDate;
    tournamentDeck: TournamentDeck;
    matches: DeckTournamentMatch[];
  };
};

export const useGetDeckTournament = (deckId: string | undefined) => {
  return useQuery<DeckTournamentResponse>({
    queryKey: ['deck-tournament', deckId],
    queryFn: deckId
      ? async () => {
          const response = await api.deck[':id']['tournament'].$get({
            param: {
              id: deckId,
            },
          });
          if (!response.ok) {
            throw new Error('Something went wrong');
          }
          return response.json() as DeckTournamentResponse;
        }
      : skipToken,
    staleTime: Infinity,
  });
};
