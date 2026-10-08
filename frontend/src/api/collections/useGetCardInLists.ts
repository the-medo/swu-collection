import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { cardInListsQueryKeys } from './cardInListsQueryKeys.ts';

export function useGetCardInLists(userId: string, cardId: string, checked: boolean) {
  return useQuery({
    queryKey: cardInListsQueryKeys.card(userId, cardId),
    queryFn:
      userId && cardId
        ? async ({ signal }) => {
            const response = await api.collection.card[':cardId'].$get(
              { param: { cardId } },
              { init: { signal } },
            );
            if (!response.ok) {
              throw await createApiError(response, 'Unable to check this card in your lists.');
            }
            return response.json();
          }
        : skipToken,
    enabled: checked && Boolean(userId && cardId),
    // Checking again or returning to this view always refreshes server data.
    staleTime: 0,
    retry: false,
  });
}
