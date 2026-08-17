import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckVersionSummary } from '../../../../types/Deck.ts';

export type DeckVersionsResponse = {
  data: DeckVersionSummary[];
  deckId: string;
};

export const useGetDeckVersions = (deckId: string | undefined) =>
  useQuery<DeckVersionsResponse>({
    queryKey: ['deck-versions', deckId],
    queryFn: deckId
      ? async () => {
          const response = await api.deck[':id'].versions.$get({ param: { id: deckId } });
          if (!response.ok) throw new Error('Unable to load deck versions');
          return (await response.json()) as DeckVersionsResponse;
        }
      : skipToken,
  });
