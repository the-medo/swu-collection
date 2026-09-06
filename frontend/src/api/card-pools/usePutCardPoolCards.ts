import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
import type { ErrorWithStatus } from '../../../../types/ErrorWithStatus.ts';
import type { GetCardPoolCardsResponse } from '../../../../server/routes/card-pools/_id/cards/get.ts';
import type { CardPoolDataResponse } from './useGetCardPool.ts';

export interface PutCardPoolCardsBody {
  cards: string[];
}

export interface PutCardPoolCardsResponse {
  data: {
    id: string;
    replaced: number;
    leaders: string[];
    status: 'in_progress' | 'ready';
  };
}

type PutCardPoolCardsContext = {
  previousCards: GetCardPoolCardsResponse | undefined;
  previousPool: CardPoolDataResponse | undefined;
};

export const mapCardIdsToPoolCards = (cards: string[]): GetCardPoolCardsResponse =>
  Object.fromEntries(cards.map((cardId, index) => [index + 1, cardId]));

export const usePutCardPoolCards = (id: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<
    PutCardPoolCardsResponse,
    Error & ErrorWithStatus,
    PutCardPoolCardsBody,
    PutCardPoolCardsContext
  >({
    mutationFn: async body => {
      if (!id) throw new Error('Card pool id is required');
      const res = await api['card-pools'][':id'].cards.$put({
        param: { id },
        json: body,
      });
      if (!res.ok) {
        throw await createApiError(res, 'Failed to replace card pool cards');
      }
      return (await res.json()) as PutCardPoolCardsResponse;
    },
    onMutate: async body => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['card-pool-cards', id] }),
        queryClient.cancelQueries({ queryKey: ['card-pool', id] }),
      ]);

      const previousCards = queryClient.getQueryData<GetCardPoolCardsResponse>([
        'card-pool-cards',
        id,
      ]);
      const previousPool = queryClient.getQueryData<CardPoolDataResponse>(['card-pool', id]);

      queryClient.setQueryData<GetCardPoolCardsResponse>(
        ['card-pool-cards', id],
        mapCardIdsToPoolCards(body.cards),
      );
      queryClient.setQueryData<CardPoolDataResponse>(['card-pool', id], current =>
        current
          ? {
              ...current,
              data: {
                ...current.data,
                status: body.cards.length > 0 ? 'ready' : 'in_progress',
              },
            }
          : current,
      );

      return { previousCards, previousPool };
    },
    onSuccess: result => {
      queryClient.setQueryData<CardPoolDataResponse>(['card-pool', id], current =>
        current
          ? {
              ...current,
              data: {
                ...current.data,
                leaders: result.data.leaders.join(','),
                status: result.data.status,
              },
            }
          : current,
      );
    },
    onError: (error, _body, context) => {
      if (context?.previousCards !== undefined) {
        queryClient.setQueryData(['card-pool-cards', id], context.previousCards);
      }
      if (context?.previousPool !== undefined) {
        queryClient.setQueryData(['card-pool', id], context.previousPool);
      }

      if (error.status === 409) {
        queryClient.setQueryData<CardPoolDataResponse>(['card-pool', id], current =>
          current ? { ...current, data: { ...current.data, hasDecks: true } } : current,
        );
      }
    },
  });
};
