import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import { UserDecksResponse } from '../../../../server/routes/user.ts';

export type PostDeckRequest = {
  format: number;
  name: string;
  description: string;
  public: boolean;
};

/**
 * Hook to create a new collection.
 */
export const usePostDeck = () => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PostDeckRequest) => {
      if (!user?.id) {
        throw new Error('User id is required');
      }
      const response = await api.deck.$post({
        json: payload,
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      const data = await response.json();
      return data;
    },
    onSuccess: result => {
      queryClient.setQueryData<UserDecksResponse>(['decks', user?.id], oldData => {
        if (!user?.id) return undefined;
        if (!oldData) {
          return { userId: user.id, decks: [result.data[0]] };
        }
        return { userId: user.id, decks: [...oldData.decks, result.data[0]] };
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error while creating a deck',
        description: error.toString(),
      });
    },
  });
};
