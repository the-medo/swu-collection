import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { updateGetUserCollections } from '@/api/useGetUserCollections.ts';

export const useDeleteCollection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      const response = await api.collection[':id'].$delete({
        param: { id: collectionId },
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    },
    onSuccess: result => {
      const deletedCollection = result.data;

      console.log(['collection', deletedCollection?.id]);
      queryClient.invalidateQueries({
        queryKey: ['collection', deletedCollection?.id],
        exact: true,
      });

      updateGetUserCollections(deletedCollection.userId, oldData => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          collections: oldData.collections.filter(col => col.id !== deletedCollection.id),
        };
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error while deleting collection',
        description: error.toString(),
      });
    },
  });
};
