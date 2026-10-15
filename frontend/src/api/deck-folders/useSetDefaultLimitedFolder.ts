import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import { toast } from '@/hooks/use-toast.ts';
import { deckFolderKeys } from './queryKeys.ts';

export function useSetDefaultLimitedFolder(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string | null) => {
      const response = await api['user-settings'].$post({
        json: { defaultLimitedFolderId: folderId },
      });
      if (!response.ok) throw await createApiError(response, 'Could not save the limited folder.');
    },
    // The folder list carries the server preference in an account-scoped cache.
    onSuccess: () => client.invalidateQueries({ queryKey: deckFolderKeys.user(userId) }),
    onError: error =>
      toast({
        variant: 'destructive',
        title: 'Could not save the limited folder',
        description: error.message,
      }),
  });
}
