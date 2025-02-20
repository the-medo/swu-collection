import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { CardList, CardVariant } from '../../../lib/swu-resources/types.ts';
import { SwuSet } from '../../../types/enums.ts';

export type CardsBySetAndNumber = Partial<
  Record<SwuSet, Record<number, { variant: CardVariant; cardId: string }> | undefined>
>;

export type CardListResponse = {
  cards: CardList;
  cardIds: string[];
  cardsByCardNo: CardsBySetAndNumber;
};

export const useCardList = (): UseQueryResult<CardListResponse> => {
  return useQuery({
    queryKey: ['cardList'],
    queryFn: async () => {
      const response = await api.cards.$get();
      if (!response.ok) {
        throw new Error('Something went wrong');
      }
      const data = await response.json();

      const cardIds = Object.keys(data.cards).sort((a, b) => a.localeCompare(b));
      const cardsByCardNo: CardsBySetAndNumber = {};

      cardIds.forEach(cid => {
        const card = data.cards[cid];
        const variantIds = Object.keys(card?.variants ?? {});
        variantIds.forEach(vid => {
          const v = card?.variants[vid];
          if (v && v.baseSet && ['Standard', 'Hyperspace', 'Showcase'].includes(v.variantName)) {
            if (!cardsByCardNo[v.set]) cardsByCardNo[v.set] = {};
            cardsByCardNo[v.set]![v.cardNo] = {
              variant: v,
              cardId: cid,
            };
          }
        });
      });

      console.log({ cardsByCardNo });

      return {
        cards: data.cards,
        cardIds,
        cardsByCardNo,
      };
    },
    staleTime: Infinity,
  });
};
