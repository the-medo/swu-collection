import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { applyDeletedDeckFolderCaches } from './deckFolderCache.ts';
import { toast } from '@/hooks/use-toast.ts';

export function useDeleteDeckFolder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api['deck-folders'][':id'].$delete({ param: { id } });
      if (!response.ok) throw await createApiError(response, 'Failed to remove folder');
      return response.json();
    },
    onSuccess: (_, id) => applyDeletedDeckFolderCaches(client, id),
    onError: error =>
      toast({
        variant: 'destructive',
        title: 'Could not remove folder',
        description: error.message,
      }),
  });
}
