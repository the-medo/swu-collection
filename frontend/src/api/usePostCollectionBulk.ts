import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import type { ZCollectionBulkInsertRequest } from '../../../types/ZCollectionCard.ts';

export type PostCollectionBulkResponse = {
  changed: number;
  deleted: number;
  amount: number;
};

export const usePostCollectionBulk = (collectionId: string) => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ZCollectionBulkInsertRequest) => {
      if (!user?.id) {
        throw new Error('User id is required');
      }
      const response = await api.collection[':id'].bulk.$post({
        param: { id: collectionId },
        json: payload,
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const data = await response.json();
      return data;
    },
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['collection-content', collectionId] });
      toast({
        title: 'Bulk action succeeded!',
        description: `Changed: ${data.changed}; Removed: ${data.deleted}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error while doing bulk action',
        description: error.toString(),
      });
    },
  });
};
