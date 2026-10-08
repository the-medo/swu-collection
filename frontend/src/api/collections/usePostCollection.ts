import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import type { UserCollectionsResponse } from '../../../../server/routes/user.ts';
import type { CollectionType } from '../../../../types/enums.ts';

export type PostCollectionRequest = {
  title: string;
  description: string;
  collectionType: CollectionType;
  public: boolean;
  forSale?: boolean;
  forDecks?: boolean;
};

/**
 * Hook to create a new collection.
 */
export const usePostCollection = () => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PostCollectionRequest) => {
      if (!user?.id) {
        throw new Error('User id is required');
      }
      const response = await api.collection.$post({
        json: payload,
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const data = await response.json();
      return data;
    },
    onSuccess: result => {
      if (!user) return;
      queryClient.setQueriesData<UserCollectionsResponse>(
        { queryKey: ['collections', user.id] },
        oldData =>
          oldData ? { ...oldData, collections: [...oldData.collections, result.data[0]] } : oldData,
      );
      void queryClient.invalidateQueries({ queryKey: ['collections', user.id] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error while creating collection',
        description: error.toString(),
      });
    },
  });
};
