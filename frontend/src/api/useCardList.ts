import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { CardList } from '../../../lib/swu-resources/types.ts';

export type CardListResponse = {
  cards: CardList;
  cardIds: string[];
};

export const useCardList = (): UseQueryResult<CardListResponse> => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const response = await api.cards.$get();
      if (!response.ok) {
        throw new Error('Something went wrong');
      }
      const data = await response.json();
      return {
        cards: data.cards,
        cardIds: Object.keys(data.cards).sort((a, b) => a.localeCompare(b)),
      };
    },
    staleTime: Infinity,
  });
};
