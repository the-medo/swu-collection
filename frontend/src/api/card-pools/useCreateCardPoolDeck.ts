import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { Visibility } from '../../../../shared/types/visibility.ts';
import type { Deck } from '../../../../types/Deck.ts';
import { createApiError } from '@/api/errors.ts';
import type { CardPoolDataResponse } from './useGetCardPool.ts';

export interface CreateCardPoolDeckBody {
  name?: string;
  description?: string;
  visibility?: Visibility;
}

export interface CreateCardPoolDeckResponse {
  data: {
    deck: Deck;
    createdCardsCount: number;
  };
}

export const useCreateCardPoolDeck = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<CreateCardPoolDeckResponse, Error, CreateCardPoolDeckBody>({
    mutationFn: async body => {
      if (!id) throw new Error('Card pool id is required');
      const res = await api['card-pools'][':id'].decks.$post({
        param: { id },
        json: body,
      });
      if (!res.ok) {
        throw await createApiError(res, 'Failed to create deck for card pool');
      }
      return (await res.json()) as CreateCardPoolDeckResponse;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['card-pool-decks', id], exact: false });
      queryClient.setQueryData<CardPoolDataResponse>(['card-pool', id], current =>
        current ? { ...current, data: { ...current.data, hasDecks: true } } : current,
      );
      // New deck may also affect global decks views
      void queryClient.invalidateQueries({ queryKey: ['decks'], exact: false });
    },
  });
};
