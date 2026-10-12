import { deckKeys } from './queryKeys.ts';
import { createApiError } from '@/api/errors.ts';
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
    queryKey: deckKeys.versions(deckId, session.data?.user.id),
    queryFn: deckId
      ? async () => {
          const response = await api.deck[':id'].versions.$get({ param: { id: deckId } });
          if (!response.ok) throw await createApiError(response, 'Unable to load deck versions');
          return (await response.json()) as DeckVersionsResponse;
        }
      : skipToken,
  });
};
