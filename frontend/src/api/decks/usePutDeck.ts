import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { toast } from '@/hooks/use-toast.ts';
import { InferResponseType } from 'hono';
import { ZDeckUpdateRequest } from '../../../../types/ZDeck.ts';

export const usePutDeck = (deckId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ZDeckUpdateRequest & { deckId?: string }) => {
      if (!deckId && !data.deckId) {
        throw new Error('Deck id is required');
      }

      const response = await api.deck[':id'].$put({
        param: { id: deckId ?? data.deckId! },
        json: data,
      });

      if (!response.ok) {
        throw new Error(
          response.statusText === 'Internal Server Error'
            ? 'Something went wrong while updating the deck'
            : response.statusText,
        );
      }

      return response.json() as unknown as { data: any };
    },
    onSuccess: result => {
      const $getDeck = api.deck[':id'].$get;
      type ResType = InferResponseType<typeof $getDeck>;

      queryClient.setQueryData(['deck', result.data.id], (oldData: ResType) => ({
        ...oldData,
        deck: {
          ...result.data,
        },
      }));

      toast({
        title: 'Deck updated successfully',
      });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error while updating the deck',
        description: (error as Error).toString(),
      });
    },
  });
};
