import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';
import { ZDeckFavoriteRequest } from '../../../../types/ZDeck.ts';

/**
 * Hook to favorite or unfavorite a deck.
 * @param deckId - The ID of the deck to favorite/unfavorite
 */
export const usePostDeckFavorite = (deckId: string | undefined) => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ZDeckFavoriteRequest) => {
      if (!deckId) {
        throw new Error('Deck ID is required');
      }
      if (!user?.id) {
        throw new Error('User must be logged in');
      }

      const response = await api.deck[':id'].favorite.$post({
        param: { id: deckId },
        json: payload,
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const data = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      
      // Show success message
      const action = variables.isFavorite ? 'favorited' : 'unfavorited';
      toast({
        title: `Deck ${action}`,
        description: `The deck has been ${action} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error updating favorite status',
        description: error.toString(),
      });
    },
  });
};