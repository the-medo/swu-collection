import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { Collection } from '../../../types/Collection.ts';
import type { ZCollectionUpdateRequest } from '../../../types/ZCollection.ts';
import { InferResponseType } from 'hono';

export interface CollectionResponse {
  data: Collection[];
}

/**
 * Hook to update a collection.
 */
export const usePutCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ZCollectionUpdateRequest & { collectionId: string }) => {
      const { collectionId, ...updateData } = data;
      const response = await api.collection[':id'].$put({
        param: { id: collectionId },
        json: updateData,
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      // Assuming the endpoint returns { data: [updatedCollection] }
      return response.json();
    },
    onSuccess: result => {
      const $getCollection = api.collection[':id'].$get;
      type ResType = InferResponseType<typeof $getCollection>;
      // Update the cache for the single collection
      queryClient.setQueryData(['collection', result.data.id], (oldData: ResType) => ({
        ...oldData,
        collection: {
          ...result.data,
        },
      }));

      // Optionally, you could also update a list of user collections if needed:
      // queryClient.invalidateQueries(['collections', userId]);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error while updating collection',
        description: error.toString(),
      });
    },
  });
};
