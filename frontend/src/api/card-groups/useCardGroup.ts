import { useQuery, skipToken } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { cardGroupKeys } from './queryKeys.ts';

export function useCardGroup(id: string) {
  return useQuery({
    queryKey: cardGroupKeys.detail(id),
    staleTime: 60_000,
    retry: false,
    queryFn: id
      ? async ({ signal }) => {
          const response = await api['card-groups'][':id'].$get(
            { param: { id } },
            { init: { signal } },
          );
          if (!response.ok) throw await createApiError(response, 'Could not load this card group.');
          return (await response.json()).data;
        }
      : skipToken,
  });
}
