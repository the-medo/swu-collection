import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';

export type PostCollectionRequest = {
  title: string;
  description: string;
  wantlist: boolean;
  public: boolean;
};

export interface Collection {
  id: string;
  title: string;
  description: string;
  wantlist: boolean;
  public: boolean;
  // add other fields if needed
}

export interface UserCollectionsResponse {
  collections: Collection[];
}

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
      queryClient.setQueryData<UserCollectionsResponse>(['collections', user?.id], oldData => {
        if (!oldData) {
          return { collections: [result.data[0]] };
        }
        return { collections: [...oldData.collections, result.data[0]] };
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error while creating collection',
        description: error.toString(),
      });
    },
  });
};
