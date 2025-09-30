import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import { ZDeckCreateRequest } from '../../../../types/ZDeck.ts';

/**
 * Hook to create a new deck.
 */
export const usePostDeck = () => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ZDeckCreateRequest) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'], exact: false });
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
