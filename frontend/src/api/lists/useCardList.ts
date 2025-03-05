import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type {
  CardDataWithVariants,
  CardList,
  CardListVariants,
  CardVariant,
} from '../../../../lib/swu-resources/types.ts';
import { SwuSet } from '../../../../types/enums.ts';

export type CardsBySetAndNumber = Partial<
  Record<SwuSet, Record<number, { variant: CardVariant; cardId: string }> | undefined>
>;
export type CardsByCardType = Partial<
  Record<string, Record<string, CardDataWithVariants<CardListVariants> | undefined> | undefined>
>;

export type CardListResponse = {
  cards: CardList;
  cardIds: string[];
  cardsByCardNo: CardsBySetAndNumber;
  cardsByCardType: CardsByCardType;
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
      const cardsByCardType: CardsByCardType = {};

      cardIds.forEach(cid => {
        const card = data.cards[cid];
        const variantIds = Object.keys(card?.variants ?? {});
        const type = card?.type ?? 'Unknown';

        if (!cardsByCardType[type]) cardsByCardType[type] = {};
        cardsByCardType[type][cid] = card;

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

      return {
        cards: data.cards,
        cardIds,
        cardsByCardNo,
        cardsByCardType,
      };
    },
    staleTime: Infinity,
  });
};
