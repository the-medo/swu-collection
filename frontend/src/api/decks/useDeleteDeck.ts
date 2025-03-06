import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { updateGetUserDecks } from '@/api/user/useGetUserDecks.ts';

export const useDeleteDeck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deckId: string) => {
      const response = await api.deck[':id'].$delete({
        param: { id: deckId },
      });
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.json();
    },
    onSuccess: result => {
      const deletedDeck = result.data;

      queryClient.invalidateQueries({
        queryKey: ['deck', deletedDeck?.id],
        exact: true,
      });

      updateGetUserDecks(deletedDeck.userId, oldData => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          decks: oldData.decks.filter(col => col.id !== deletedDeck.id),
        };
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error while deleting deck',
        description: error.toString(),
      });
    },
  });
};
