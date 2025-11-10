import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { GetCardPoolCardsResponse } from '../../../../server/routes/card-pools/_id/cards/get.ts';

export const useGetCardPoolCards = (id: string | undefined) => {
  return useQuery<GetCardPoolCardsResponse>({
    queryKey: ['card-pool-cards', id],
    queryFn: id
      ? async () => {
          const res = await api['card-pools'][':id'].cards.$get({ param: { id } });
          if (!res.ok) {
            throw new Error('Failed to fetch card pool cards');
          }
          return (await res.json()) as GetCardPoolCardsResponse;
        }
      : skipToken,
    staleTime: Infinity,
  });
};
