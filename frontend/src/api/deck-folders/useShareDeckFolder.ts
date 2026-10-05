import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { toast } from '@/hooks/use-toast.ts';
import { invalidateDeckFolderCaches } from './deckFolderCache.ts';
import type { DeckFolderSharingRequest } from '../../../../types/DeckFolder.ts';

export function useShareDeckFolder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...json }: DeckFolderSharingRequest & { id: string }) => {
      const response = await api['deck-folders'][':id'].sharing.$put({ param: { id }, json });
      if (!response.ok) throw await createApiError(response, 'Could not update sharing');
      return (await response.json()).data;
    },
    onSuccess: () => invalidateDeckFolderCaches(client),
    onError: error =>
      toast({
        variant: 'destructive',
        title: 'Could not update sharing',
        description: error.message,
      }),
  });
}
