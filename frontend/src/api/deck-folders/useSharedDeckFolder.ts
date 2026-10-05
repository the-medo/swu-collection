import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { useSession } from '@/lib/auth-client.ts';
import { deckFolderKeys } from './queryKeys.ts';
import type { SharedDeckFolder } from '../../../../types/DeckFolder.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';

export function useSharedDeckFolder(id: string) {
  const session = useSession();
  const user = session.data?.user;
  return useQuery<SharedDeckFolder, ErrorWithStatus>({
    enabled: !session.isPending,
    queryKey: deckFolderKeys.shared(id, user?.id),
    queryFn: async () => {
      const response = await api['deck-folders'][':id'].$get({ param: { id } });
      if (!response.ok) throw await createApiError(response, 'Could not load folder');
      return (await response.json()).data;
    },
    staleTime: 0,
    refetchInterval: 30_000,
    retry: (count, error) => error.status !== 404 && count < 2,
  });
}
