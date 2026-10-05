import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { deckFolderKeys } from './queryKeys.ts';

export function useDeckFolders(userId: string | undefined) {
  return useQuery({
    queryKey: deckFolderKeys.user(userId),
    queryFn: userId
      ? async () => {
          const response = await api['deck-folders'].$get();
          if (!response.ok) throw await createApiError(response, 'Failed to load folders');
          return (await response.json()).data;
        }
      : skipToken,
    staleTime: Infinity,
  });
}
