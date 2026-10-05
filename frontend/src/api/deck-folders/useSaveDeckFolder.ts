import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { invalidateDeckFolderCaches } from './deckFolderCache.ts';
import { toast } from '@/hooks/use-toast.ts';
import type { DeckFolderUpdateRequest } from '../../../../types/DeckFolder.ts';

export function useSaveDeckFolder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...json }: DeckFolderUpdateRequest & { id?: string }) => {
      const response = id
        ? await api['deck-folders'][':id'].$put({ param: { id }, json })
        : await api['deck-folders'].$post({ json: { ...json, parentId: json.parentId ?? null } });
      if (!response.ok) throw await createApiError(response, 'Failed to save folder');
      return (await response.json()).data;
    },
    onSuccess: () => invalidateDeckFolderCaches(client),
    onError: error =>
      toast({ variant: 'destructive', title: 'Could not save folder', description: error.message }),
  });
}
