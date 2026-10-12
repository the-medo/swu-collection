import { useSession } from '@/lib/auth-client.ts';
import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckVersionSummary } from '../../../../types/Deck.ts';

export type DeckVersionsResponse = {
  data: DeckVersionSummary[];
  deckId: string;
};

export const useGetDeckVersions = (deckId: string | undefined) => {
  const session = useSession();
  return useQuery<DeckVersionsResponse>({
    enabled: !session.isPending,
    queryKey: ['deck-versions', deckId, session.data?.user.id ?? 'anonymous'],
    queryFn: deckId
      ? async () => {
          const response = await api.deck[':id'].versions.$get({ param: { id: deckId } });
          if (!response.ok) throw new Error('Unable to load deck versions');
          return (await response.json()) as DeckVersionsResponse;
        }
      : skipToken,
  });
};
