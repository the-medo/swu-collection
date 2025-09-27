import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import type { ZCollectionCardCreateRequest } from '../../../../types/ZCollectionCard.ts';

export type AddMultipleCollectionCardsItem = Omit<ZCollectionCardCreateRequest, 'amount'> & {
  // allow negative and positive values as per backend schema
  amount: number;
};

export type AddMultipleCollectionCardsRequest = {
  collectionId: string;
  items: AddMultipleCollectionCardsItem[];
  remove?: boolean;
};

export const useAddMultipleCollectionCards = () => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectionId, items, remove }: AddMultipleCollectionCardsRequest) => {
      if (!user?.id) {
        throw new Error('User must be logged in to modify a collection');
      }

      const response = await api.collection[':id']['multiple'].$post({
        param: { id: collectionId },
        json: remove ? items.map(i => ({ ...i, amount: -Math.abs(i.amount) })) : items,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Failed to update collection cards');
      }

      return response.json();
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-collections-sync'] });
      queryClient.invalidateQueries({
        queryKey: ['collection', variables.collectionId],
      });
      queryClient.invalidateQueries({ queryKey: ['collection-content', variables.collectionId] });

      const data = result?.data as
        | { changed?: number; deleted?: number; amount?: number }
        | undefined;
      toast({
        title: 'Collection updated',
        description: data
          ? `Applied ${data.amount ?? 0} changes (${data.changed ?? 0} upserts, ${data.deleted ?? 0} deletions)`
          : 'Cards have been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update collection',
        description: error.message,
      });
    },
  });
};
