import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { useUser } from '@/hooks/useUser.ts';

export const useDuplicateDeck = () => {
  const user = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      if (!user?.id) {
        throw new Error('User must be logged in to duplicate a deck');
      }

      const response = await api.deck[':id'].duplicate.$post({
        param: { id: deckId },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to duplicate deck');
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'], exact: false });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to duplicate deck',
        description: error.message,
      });
    },
  });
};
