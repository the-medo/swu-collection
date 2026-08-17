import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';

export const useSaveDeckVersion = (deckId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (changeNote?: string) => {
      const response = await api.deck[':id'].versions.$post({
        param: { id: deckId },
        json: { changeNote: changeNote || undefined },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error('message' in error ? error.message : 'Unable to save deck version');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['deck-versions'] });
      void queryClient.invalidateQueries({ queryKey: ['deck-version-diff'] });
      void queryClient.invalidateQueries({ queryKey: ['deck', deckId] });
      toast({ title: 'Deck version saved' });
    },
    onError: (error: Error) =>
      toast({
        variant: 'destructive',
        title: 'Unable to save deck version',
        description: error.message,
      }),
  });
};
