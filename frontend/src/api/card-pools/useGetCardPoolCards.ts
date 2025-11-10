import { skipToken, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';

export type CardPoolCardsMap = Partial<Record<number, string>>;

export const useGetCardPoolCards = (id: string | undefined) => {
  return useQuery<CardPoolCardsMap>({
    queryKey: ['card-pool-cards', id],
    queryFn: id
      ? async () => {
          const res = await api['card-pools'][':id'].cards.$get({ param: { id } });
          if (!res.ok) {
            throw new Error('Failed to fetch card pool cards');
          }
          return (await res.json()) as CardPoolCardsMap;
        }
      : skipToken,
    staleTime: Infinity,
  });
};
