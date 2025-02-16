import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { Collection } from '../../../types/Collection.ts';
import type { ZCollectionUpdateRequest } from '../../../types/ZCollection.ts';
import { InferResponseType } from 'hono';
import { updateGetUserCollections } from '@/api/useGetUserCollections.ts';

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

      return response.json();
    },
    onSuccess: result => {
      const $getCollection = api.collection[':id'].$get;
      type ResType = InferResponseType<typeof $getCollection>;

      queryClient.setQueryData(['collection', result.data.id], (oldData: ResType) => ({
        ...oldData,
        collection: {
          ...result.data,
        },
      }));

      updateGetUserCollections(result.data.userId, oldData => {
        if (!oldData) return oldData;
        const updatedCollections = oldData.collections.map(col =>
          col.id === result.data.id ? result.data : col,
        );
        return { ...oldData, collections: updatedCollections };
      });
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
