import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

/**
 * Hook to trigger (re)computation of a deck's prices and fetch the latest data.
 * @param deckId - The ID of the deck
 */
export const usePostDeckPrice = (deckId: string | undefined) => {
  return useMutation({
    mutationFn: async () => {
      if (!deckId) {
        throw new Error('Deck ID is required');
      }

      const response = await api.deck[':id'].price.$post({
        param: { id: deckId },
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return await response.json();
    },
    onSuccess: () => {
      //Todo:  Invalidate fetched deck price?

      toast({
        title: 'Deck prices updated',
        description: 'Latest price data has been fetched for this deck.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error updating deck prices',
        description: error?.toString?.() ?? 'Unknown error',
      });
    },
  });
};
