import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { toast } from '@/hooks/use-toast.ts';
import { invalidateDeckFolderCaches } from './deckFolderCache.ts';
import type { DeckFolderPositionRequest } from '../../../../types/DeckFolder.ts';

export function usePositionDeckFolder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...json }: DeckFolderPositionRequest & { id: string }) => {
      const response = await api['deck-folders'][':id'].position.$put({ param: { id }, json });
      if (!response.ok) throw await createApiError(response, 'Failed to move folder');
      return (await response.json()).data;
    },
    onSuccess: () => invalidateDeckFolderCaches(client),
    onError: error =>
      toast({ variant: 'destructive', title: 'Could not move folder', description: error.message }),
  });
}
