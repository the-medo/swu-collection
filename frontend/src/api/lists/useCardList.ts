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
  allTraits: Set<string>;
  allKeywords: Set<string>;
  allVariants: Set<string>;
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
      const allTraits = new Set<string>();
      const allKeywords = new Set<string>();
      const allVariants = new Set<string>();

      cardIds.forEach(cid => {
        const card = data.cards[cid];
        if (!card) return;
        const variantIds = Object.keys(card.variants ?? {});
        const type = card?.type ?? 'Unknown';

        if (card.traits) {
          if (!card.traitMap) card.traitMap = {};
          card.traits.forEach(trait => {
            allTraits.add(trait);
            card.traitMap![trait] = true;
          });
        }

        if (card.keywords) {
          if (!card.keywordMap) card.keywordMap = {};
          card.keywords.forEach(kw => {
            allKeywords.add(kw);
            card.keywordMap![kw] = true;
          });
        }

        if (card.arenas) {
          if (!card.arenaMap) card.arenaMap = {};
          card.arenas.forEach(a => {
            card.arenaMap![a] = true;
          });
        }

        if (card.aspects) {
          if (!card.aspectMap) card.aspectMap = {};
          card.aspects.forEach(a => {
            if (card.aspectMap![a]) {
              card.aspectMap![a]++;
            } else {
              card.aspectMap![a] = 1;
            }
          });
        }

        if (!cardsByCardType[type]) cardsByCardType[type] = {};
        cardsByCardType[type][cid] = card;

        if (!card.variantMap) card.variantMap = {};
        variantIds.forEach(vid => {
          const v = card?.variants[vid];
          if (!v) return;
          card.variantMap![v.variantName] = vid;
          allVariants.add(v.variantName);
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
        allTraits,
        allKeywords,
        allVariants,
      };
    },
    staleTime: Infinity,
  });
};
