import { useSession } from '@/lib/auth-client.ts';
import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { DeckVersionDiff } from '../../../../types/Deck.ts';
import { deckKeys } from './queryKeys.ts';
import { createApiError } from '@/api/errors.ts';

export type DeckVersionDiffResponse = { data: DeckVersionDiff };

export const useGetDeckVersionDiff = (
  deckId: string | undefined,
  versionId: string | undefined,
) => {
  const session = useSession();
  return useQuery<DeckVersionDiffResponse>({
    enabled: !session.isPending,
    queryKey: deckKeys.diff(deckId, versionId, session.data?.user.id),
    queryFn:
      deckId && versionId
        ? async () => {
            const response = await api.deck[':id'].versions[':versionId'].diff.$get({
              param: { id: deckId, versionId },
            });
            if (!response.ok)
              throw await createApiError(response, 'Unable to load version changes');
            return (await response.json()) as DeckVersionDiffResponse;
          }
        : skipToken,
  });
};
